import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis } from '../../src/config/redis';
import { getNotificationQueue } from '../../src/jobs/queues/notification.queue';
import { searchCache } from '../../src/modules/search/search.cache';

const app = createApp();
const prefix = `test-crs-${Date.now()}`;
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
  return tutor;
}

const api = (method: 'get' | 'post' | 'patch' | 'delete', url: string, who?: Actor) => {
  const r = request(app)[method](`/api/v1${url}`);
  return who ? r.set('Authorization', bearer(who.token)) : r;
};

const courseBody = (over: Record<string, unknown> = {}) => ({
  title: `Course ${++counter} fundamentals`,
  description: 'A step by step course that covers the basics with practice.',
  subjectId,
  level: 'BEGINNER',
  price: 0,
  ...over,
});

const lessonBody = (over: Record<string, unknown> = {}) => ({
  title: 'Introduction',
  content: 'Welcome to the course. Here is the first lesson.',
  durationMin: 10,
  ...over,
});

async function publishedCourse(tutor: Actor, lessons = 2, over: Record<string, unknown> = {}) {
  const created = await api('post', '/courses', tutor).send(courseBody(over));
  const id = created.body.data.course.id as string;
  const lessonIds: string[] = [];
  for (let i = 0; i < lessons; i++) {
    const l = await api('post', `/courses/${id}/lessons`, tutor).send(
      lessonBody({ title: `Lesson ${i + 1}` }),
    );
    lessonIds.push(l.body.data.lesson.id);
  }
  await api('post', `/courses/${id}/publish`, tutor);
  return { id, lessonIds };
}

beforeAll(async () => {
  subjectId = (await prisma.subject.findFirstOrThrow()).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('courses: authoring', () => {
  it('enforces roles, validation and ownership', async () => {
    const tutor = await createTutor();
    const other = await createTutor();
    const student = await register('STUDENT');

    expect((await api('post', '/courses').send(courseBody())).status).toBe(401);
    expect((await api('post', '/courses', student).send(courseBody())).status).toBe(403);
    expect((await api('post', '/courses', tutor).send(courseBody({ price: -1 }))).status).toBe(400);

    const noProfile = await register('TUTOR');
    expect((await api('post', '/courses', noProfile).send(courseBody())).status).toBe(400);

    const created = await api('post', '/courses', tutor).send(courseBody());
    expect(created.status).toBe(201);
    const id = created.body.data.course.id;

    const bad = await api('post', `/courses/${id}/lessons`, tutor).send(
      lessonBody({ videoUrl: 'javascript:alert(1)' }),
    );
    expect(bad.status).toBe(400);

    expect((await api('patch', `/courses/${id}`, other).send({ price: 5 })).status).toBe(403);
    expect((await api('post', `/courses/${id}/lessons`, other).send(lessonBody())).status).toBe(
      403,
    );
    const missing = '00000000-0000-4000-8000-000000000000';
    expect((await api('patch', `/courses/${missing}`, tutor).send({ price: 5 })).status).toBe(404);

    const edited = await api('patch', `/courses/${id}`, tutor).send({ price: 1500 });
    expect(edited.body.data.course.price).toBe(1500);
  });

  it('needs a lesson to publish, hides drafts publicly, and guards deletes', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const created = await api('post', '/courses', tutor).send(courseBody());
    const id = created.body.data.course.id;

    expect((await api('post', `/courses/${id}/publish`, tutor)).status).toBe(400);
    expect((await api('get', `/courses/${id}`)).status).toBe(404);

    const lesson = await api('post', `/courses/${id}/lessons`, tutor).send(
      lessonBody({ videoUrl: 'https://example.com/v' }),
    );
    expect(lesson.status).toBe(201);
    expect(lesson.body.data.lesson.position).toBe(1);

    expect((await api('post', `/courses/${id}/publish`, tutor)).status).toBe(200);
    const pub = await api('get', `/courses/${id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.course.lessonCount).toBe(1);
    expect(pub.body.data.course.lessons[0].content).toBeUndefined();

    // Last lesson of a published course cannot be removed.
    const lid = lesson.body.data.lesson.id;
    expect((await api('delete', `/courses/${id}/lessons/${lid}`, tutor)).status).toBe(409);

    await api('post', `/courses/${id}/enroll`, student);
    expect((await api('delete', `/courses/${id}`, tutor)).status).toBe(409);

    const mine = await api('get', '/courses/mine', tutor);
    expect(mine.body.data).toHaveLength(1);
    expect(
      (await api('get', `/courses/${id}/manage`, tutor)).body.data.course.lessons[0].content,
    ).toBeTruthy();
  });

  it('deletes a course that has no students', async () => {
    const tutor = await createTutor();
    const created = await api('post', '/courses', tutor).send(courseBody());
    const id = created.body.data.course.id;
    expect((await api('delete', `/courses/${id}`, tutor)).status).toBe(200);
    expect((await api('get', `/courses/${id}/manage`, tutor)).status).toBe(404);
  });
});

describe('courses: catalogue', () => {
  it('lists only published courses with filters, sort and paging', async () => {
    const tutor = await createTutor();
    const unique = `Zebra${Date.now()}`;
    const cheap = await publishedCourse(tutor, 1, {
      title: `${unique} cheap basics`,
      price: 0,
    });
    await publishedCourse(tutor, 1, {
      title: `${unique} pricey advanced`,
      price: 5000,
      level: 'ADVANCED',
    });
    await api('post', '/courses', tutor).send(courseBody({ title: `${unique} hidden draft` }));

    const all = await api('get', `/courses?q=${unique}`);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta.total).toBe(2);

    const free = await api('get', `/courses?q=${unique}&freeOnly=true`);
    expect(free.body.data.map((c: { id: string }) => c.id)).toEqual([cheap.id]);

    const adv = await api('get', `/courses?q=${unique}&level=ADVANCED`);
    expect(adv.body.data).toHaveLength(1);

    const sorted = await api('get', `/courses?q=${unique}&sort=priceDesc`);
    expect(sorted.body.data[0].price).toBe(5000);

    const paged = await api('get', `/courses?q=${unique}&limit=1&page=2`);
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.meta.totalPages).toBe(2);
  });
});

describe('courses: learning', () => {
  it('enrolls once, protects lessons and tracks progress', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const stranger = await register('STUDENT');
    const { id, lessonIds } = await publishedCourse(tutor, 2);

    expect((await api('post', `/courses/${id}/enroll`, tutor)).status).toBe(403);
    expect((await api('get', `/courses/${id}/lessons/${lessonIds[0]}`, stranger)).status).toBe(403);
    expect(
      (await api('post', `/courses/${id}/lessons/${lessonIds[0]}/complete`, stranger)).status,
    ).toBe(403);

    const enrolled = await api('post', `/courses/${id}/enroll`, student);
    expect(enrolled.status).toBe(201);
    expect(enrolled.body.data.progress).toEqual({ completed: 0, total: 2, percent: 0 });
    expect((await api('post', `/courses/${id}/enroll`, student)).status).toBe(409);

    const read = await api('get', `/courses/${id}/lessons/${lessonIds[0]}`, student);
    expect(read.status).toBe(200);
    expect(read.body.data.lesson.content).toBeTruthy();
    expect((await api('get', `/courses/${id}/lessons/${lessonIds[0]}`, tutor)).status).toBe(200);

    const done = await api('post', `/courses/${id}/lessons/${lessonIds[0]}/complete`, student);
    expect(done.body.data.progress.percent).toBe(50);
    // Marking twice is idempotent.
    const again = await api('post', `/courses/${id}/lessons/${lessonIds[0]}/complete`, student);
    expect(again.body.data.progress.completed).toBe(1);

    const mine = await api('get', '/enrollments/mine', student);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].progress.percent).toBe(50);

    const undone = await api('delete', `/courses/${id}/lessons/${lessonIds[0]}/complete`, student);
    expect(undone.body.data.progress.percent).toBe(0);

    const state = await api('get', `/courses/${id}/enrollment`, stranger);
    expect(state.body.data.enrolled).toBe(false);

    expect((await api('delete', `/courses/${id}/enroll`, student)).status).toBe(200);
    expect((await api('delete', `/courses/${id}/enroll`, student)).status).toBe(404);
  });

  it('notifies the tutor on enrollment', async () => {
    const tutor = await createTutor();
    const student = await register('PARENT');
    const { id } = await publishedCourse(tutor, 1);
    await api('post', `/courses/${id}/enroll`, student);

    const jobs = await getNotificationQueue().getJobs([
      'waiting',
      'active',
      'delayed',
      'completed',
    ]);
    expect(jobs.some((j) => j.data.userId === tutor.id && j.data.type === 'COURSE_ENROLLED')).toBe(
      true,
    );
  });
});
