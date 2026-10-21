import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis } from '../../src/config/redis';
import { getNotificationQueue } from '../../src/jobs/queues/notification.queue';
import { searchCache } from '../../src/modules/search/search.cache';

const app = createApp();
const prefix = `test-cls-${Date.now()}`;
let counter = 0;
const bearer = (token: string) => `Bearer ${token}`;
let subjectId: string;

type Actor = { token: string; id: string };

async function register(role: 'STUDENT' | 'PARENT' | 'TUTOR'): Promise<Actor> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `${prefix}-${++counter}@example.com`,
      password: 'Secret123',
      fullName: `User ${counter}`,
      role,
    });
  return { token: res.body.data.accessToken, id: res.body.data.user.id };
}

async function createTutor() {
  const tutor = await register('TUTOR');
  await request(app)
    .put('/api/v1/tutors/me')
    .set('Authorization', bearer(tutor.token))
    .send({
      headline: 'Experienced tutor for school students',
      bio: 'I teach with a focus on exam preparation, concepts and regular practice.',
      qualification: 'MSc',
      experienceYears: 3,
      hourlyRate: 1000,
      teachingMode: 'ONLINE',
      subjectIds: [subjectId],
      areaIds: [],
      isPublished: true,
    });
  await prisma.tutorProfile.update({
    where: { userId: tutor.id },
    data: { verificationStatus: 'VERIFIED' },
  });
  return tutor;
}

const api = (method: 'get' | 'post' | 'patch' | 'delete', url: string, who?: Actor) => {
  const r = request(app)[method](`/api/v1${url}`);
  return who ? r.set('Authorization', bearer(who.token)) : r;
};

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const classBody = (over: Record<string, unknown> = {}) => ({
  title: `Live class ${++counter}`,
  startsAt: inDays(2),
  meetingUrl: 'https://meet.example.com/abc',
  capacity: 2,
  ...over,
});

beforeAll(async () => {
  subjectId = (await prisma.subject.findFirstOrThrow()).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('classes', () => {
  it('validates input, enforces roles and hides the link publicly', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');

    expect((await api('post', '/classes').send(classBody())).status).toBe(401);
    expect((await api('post', '/classes', student).send(classBody())).status).toBe(403);
    expect(
      (await api('post', '/classes', tutor).send(classBody({ startsAt: inDays(-1) }))).status,
    ).toBe(400);
    expect(
      (await api('post', '/classes', tutor).send(classBody({ meetingUrl: 'http://x.com' }))).status,
    ).toBe(400);

    const created = await api('post', '/classes', tutor).send(classBody());
    expect(created.status).toBe(201);
    const id = created.body.data.session.id;
    expect(created.body.data.session.meetingUrl).toBeUndefined();

    const pub = await api('get', `/classes/${id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.session.meetingUrl).toBeUndefined();
    expect(pub.body.data.session.seatsLeft).toBe(2);

    const upcoming = await api('get', `/classes?tutorId=${created.body.data.session.tutor.id}`);
    expect(upcoming.body.data).toHaveLength(1);

    expect((await api('get', `/classes/${id}/join`, student)).status).toBe(403);
    expect((await api('get', `/classes/${id}/join`, tutor)).body.data.meetingUrl).toContain(
      'https://',
    );
    expect((await api('get', '/classes/mine', tutor)).body.data).toHaveLength(1);
  });

  it('books seats with capacity and duplicate rules', async () => {
    const tutor = await createTutor();
    const [a, b, c] = [
      await register('STUDENT'),
      await register('PARENT'),
      await register('STUDENT'),
    ];
    const id = (await api('post', '/classes', tutor).send(classBody({ capacity: 2 }))).body.data
      .session.id;

    expect((await api('post', `/classes/${id}/book`, tutor)).status).toBe(403);
    expect((await api('post', `/classes/${id}/book`, a)).status).toBe(201);
    expect((await api('post', `/classes/${id}/book`, a)).status).toBe(409);
    expect((await api('post', `/classes/${id}/book`, b)).status).toBe(201);
    const full = await api('post', `/classes/${id}/book`, c);
    expect(full.status).toBe(409);
    expect(full.body.error.message).toMatch(/full/i);

    expect((await api('get', `/classes/${id}/join`, a)).status).toBe(200);
    expect((await api('get', '/classes/booked', a)).body.data).toHaveLength(1);

    expect((await api('delete', `/classes/${id}/book`, a)).status).toBe(200);
    expect((await api('delete', `/classes/${id}/book`, a)).status).toBe(404);
    expect((await api('post', `/classes/${id}/book`, c)).status).toBe(201);
  });

  it('does not oversell the last seat under concurrent bookings', async () => {
    const tutor = await createTutor();
    const students = await Promise.all([1, 2, 3, 4].map(() => register('STUDENT')));
    const id = (await api('post', '/classes', tutor).send(classBody({ capacity: 1 }))).body.data
      .session.id;
    const results = await Promise.all(students.map((s) => api('post', `/classes/${id}/book`, s)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.classBooking.count({ where: { sessionId: id } })).toBe(1);
  });

  it('links to a course, requires enrollment, and notifies on schedule and cancel', async () => {
    const tutor = await createTutor();
    const other = await createTutor();
    const student = await register('STUDENT');
    const outsider = await register('STUDENT');

    const course = await api('post', '/courses', tutor).send({
      title: 'Linked course basics',
      description: 'A step by step course that covers the basics with practice.',
      subjectId,
    });
    const courseId = course.body.data.course.id;
    await api('post', `/courses/${courseId}/lessons`, tutor).send({
      title: 'Intro lesson',
      content: 'Welcome to the course. Here is the first lesson.',
    });
    await api('post', `/courses/${courseId}/publish`, tutor);
    await api('post', `/courses/${courseId}/enroll`, student);

    expect((await api('post', '/classes', other).send(classBody({ courseId }))).status).toBe(403);

    const id = (await api('post', '/classes', tutor).send(classBody({ courseId }))).body.data
      .session.id;
    expect((await api('post', `/classes/${id}/book`, outsider)).status).toBe(403);
    expect((await api('post', `/classes/${id}/book`, student)).status).toBe(201);

    expect((await api('patch', `/classes/${id}`, other).send({ title: 'Hijack' })).status).toBe(
      403,
    );
    expect((await api('patch', `/classes/${id}`, tutor).send({ capacity: 5 })).status).toBe(200);

    const cancelled = await api('post', `/classes/${id}/cancel`, tutor);
    expect(cancelled.body.data.session.status).toBe('CANCELLED');
    expect((await api('post', `/classes/${id}/cancel`, tutor)).status).toBe(409);
    expect((await api('post', `/classes/${id}/book`, outsider)).status).toBe(404);
    expect((await api('get', `/classes/${id}/join`, student)).status).toBe(409);

    const jobs = await getNotificationQueue().getJobs([
      'waiting',
      'active',
      'delayed',
      'completed',
    ]);
    const mine = jobs.filter((j) => j.data.userId === student.id).map((j) => j.data.type);
    expect(mine).toContain('CLASS_SCHEDULED');
    expect(mine).toContain('CLASS_CANCELLED');
  });
});
