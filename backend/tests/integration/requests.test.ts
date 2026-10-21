import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis } from '../../src/config/redis';
import { searchCache } from '../../src/modules/search/search.cache';
import { scoreTutor } from '../../src/modules/search/search.recommend';

const app = createApp();
const prefix = `test-req-${Date.now()}`;
let counter = 0;
const auth = (token: string) => `Bearer ${token}`;

let subjects: { id: string }[];
let areas: { id: string }[];

type Actor = { token: string; id: string; email: string; tutorId?: string };

async function register(role: 'STUDENT' | 'PARENT' | 'TUTOR'): Promise<Actor> {
  const email = `${prefix}-${++counter}@example.com`;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email,
      password: 'Secret123',
      fullName: `User ${counter}`,
      role,
      phone: '03001234567',
    });
  return { token: res.body.data.accessToken, id: res.body.data.user.id, email };
}

async function createTutor(profile: Record<string, unknown> = {}) {
  const tutor = await register('TUTOR');
  const res = await request(app)
    .put('/api/v1/tutors/me')
    .set('Authorization', auth(tutor.token))
    .send({
      headline: 'Experienced tutor for school students',
      bio: 'I teach with a focus on exam preparation, concepts and regular practice.',
      qualification: 'MSc',
      experienceYears: 3,
      hourlyRate: 1000,
      teachingMode: 'BOTH',
      subjectIds: [subjects[0]?.id],
      areaIds: [areas[0]?.id],
      isPublished: true,
      ...profile,
    });
  tutor.tutorId = res.body.data.tutor.id;
  return tutor;
}

const send = (student: Actor, body: Record<string, unknown>) =>
  request(app)
    .post('/api/v1/requests')
    .set('Authorization', auth(student.token))
    .send({
      subjectId: subjects[0]?.id,
      mode: 'ONLINE',
      message: 'I need help preparing for my exams.',
      ...body,
    });

beforeAll(async () => {
  subjects = await prisma.subject.findMany({ take: 2, orderBy: { name: 'asc' } });
  areas = await prisma.area.findMany({ take: 2, orderBy: { name: 'asc' } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('tutor requests', () => {
  it('runs the full flow: send, hide contact, accept, reveal contact', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');

    const created = await send(student, { tutorId: tutor.tutorId });
    expect(created.status).toBe(201);
    expect(created.body.data.request.status).toBe('PENDING');
    expect(created.body.data.request.tutor.email).toBeUndefined();
    const id = created.body.data.request.id as string;

    const incoming = await request(app)
      .get('/api/v1/requests/incoming')
      .set('Authorization', auth(tutor.token));
    expect(incoming.status).toBe(200);
    expect(incoming.body.data[0].student.email).toBeUndefined();

    const accepted = await request(app)
      .post(`/api/v1/requests/${id}/accept`)
      .set('Authorization', auth(tutor.token))
      .send({ note: 'Happy to help' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.request.status).toBe('ACCEPTED');
    expect(accepted.body.data.request.student.email).toBe(student.email);

    const mine = await request(app)
      .get('/api/v1/requests/mine')
      .query({ status: 'ACCEPTED' })
      .set('Authorization', auth(student.token));
    expect(mine.body.data[0].tutor.email).toBe(tutor.email);
    expect(mine.body.data[0].responseNote).toBe('Happy to help');
  });

  it('enforces roles and authentication', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const anon = await request(app).post('/api/v1/requests').send({});
    expect(anon.status).toBe(401);
    const byTutor = await send(tutor, { tutorId: tutor.tutorId });
    expect(byTutor.status).toBe(403);
    const incomingByStudent = await request(app)
      .get('/api/v1/requests/incoming')
      .set('Authorization', auth(student.token));
    expect(incomingByStudent.status).toBe(403);
  });

  it('validates input and business rules', async () => {
    const homeOnly = await createTutor({ teachingMode: 'HOME', areaIds: [areas[0]?.id] });
    const student = await register('PARENT');

    expect((await send(student, { tutorId: 'nope' })).status).toBe(400);
    expect((await send(student, { tutorId: homeOnly.tutorId, message: 'short' })).status).toBe(400);
    // ONLINE not offered
    expect((await send(student, { tutorId: homeOnly.tutorId, mode: 'ONLINE' })).status).toBe(400);
    // HOME needs an area
    expect((await send(student, { tutorId: homeOnly.tutorId, mode: 'HOME' })).status).toBe(400);
    // area the tutor does not serve
    expect(
      (await send(student, { tutorId: homeOnly.tutorId, mode: 'HOME', areaId: areas[1]?.id }))
        .status,
    ).toBe(400);
    // subject the tutor does not teach
    expect(
      (
        await send(student, {
          tutorId: homeOnly.tutorId,
          mode: 'HOME',
          areaId: areas[0]?.id,
          subjectId: subjects[1]?.id,
        })
      ).status,
    ).toBe(400);
    expect(
      (await send(student, { tutorId: homeOnly.tutorId, mode: 'HOME', areaId: areas[0]?.id }))
        .status,
    ).toBe(201);
  });

  it('rejects duplicates while pending and allows a new one after cancelling', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const first = await send(student, { tutorId: tutor.tutorId });
    expect((await send(student, { tutorId: tutor.tutorId })).status).toBe(409);

    const cancel = await request(app)
      .post(`/api/v1/requests/${first.body.data.request.id}/cancel`)
      .set('Authorization', auth(student.token));
    expect(cancel.body.data.request.status).toBe('CANCELLED');
    const again = await request(app)
      .post(`/api/v1/requests/${first.body.data.request.id}/cancel`)
      .set('Authorization', auth(student.token));
    expect(again.status).toBe(409);
    expect((await send(student, { tutorId: tutor.tutorId })).status).toBe(201);
  });

  it('does not allow requests to unpublished or suspended tutors', async () => {
    const draft = await createTutor({ isPublished: false });
    const suspended = await createTutor();
    await prisma.user.update({ where: { id: suspended.id }, data: { status: 'SUSPENDED' } });
    const student = await register('STUDENT');
    expect((await send(student, { tutorId: draft.tutorId })).status).toBe(404);
    expect((await send(student, { tutorId: suspended.tutorId })).status).toBe(404);
  });

  it('lets only the owning tutor respond, and only once', async () => {
    const tutor = await createTutor();
    const other = await createTutor();
    const student = await register('STUDENT');
    const id = (await send(student, { tutorId: tutor.tutorId })).body.data.request.id;

    const stranger = await request(app)
      .post(`/api/v1/requests/${id}/accept`)
      .set('Authorization', auth(other.token));
    expect(stranger.status).toBe(404);
    const byStudent = await request(app)
      .post(`/api/v1/requests/${id}/accept`)
      .set('Authorization', auth(student.token));
    expect(byStudent.status).toBe(403);

    const declined = await request(app)
      .post(`/api/v1/requests/${id}/decline`)
      .set('Authorization', auth(tutor.token));
    expect(declined.body.data.request.status).toBe('DECLINED');
    expect(declined.body.data.request.student.email).toBeUndefined();
    const repeat = await request(app)
      .post(`/api/v1/requests/${id}/accept`)
      .set('Authorization', auth(tutor.token));
    expect(repeat.status).toBe(409);
  });

  it("hides one student's request from another student", async () => {
    const tutor = await createTutor();
    const a = await register('STUDENT');
    const b = await register('STUDENT');
    const id = (await send(a, { tutorId: tutor.tutorId })).body.data.request.id;
    const res = await request(app)
      .post(`/api/v1/requests/${id}/cancel`)
      .set('Authorization', auth(b.token));
    expect(res.status).toBe(404);
  });

  it('caps pending requests per student at 10', async () => {
    const student = await register('STUDENT');
    for (let i = 0; i < 10; i++) {
      const tutor = await createTutor();
      expect((await send(student, { tutorId: tutor.tutorId })).status).toBe(201);
    }
    const extra = await createTutor();
    expect((await send(student, { tutorId: extra.tutorId })).status).toBe(409);
  });
});

describe('shortlist', () => {
  it('saves idempotently, lists, hides unpublished tutors and removes', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const put = () =>
      request(app)
        .put(`/api/v1/shortlist/${tutor.tutorId}`)
        .set('Authorization', auth(student.token));
    expect((await put()).status).toBe(200);
    expect((await put()).status).toBe(200);

    const list = await request(app)
      .get('/api/v1/shortlist')
      .set('Authorization', auth(student.token));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].tutor.id).toBe(tutor.tutorId);

    await prisma.tutorProfile.update({
      where: { id: tutor.tutorId },
      data: { isPublished: false },
    });
    const hidden = await request(app)
      .get('/api/v1/shortlist')
      .set('Authorization', auth(student.token));
    expect(hidden.body.data).toHaveLength(0);
    expect((await put()).status).toBe(404);

    const del = await request(app)
      .delete(`/api/v1/shortlist/${tutor.tutorId}`)
      .set('Authorization', auth(student.token));
    expect(del.status).toBe(200);
  });

  it('requires a student or parent', async () => {
    const tutor = await createTutor();
    const res = await request(app).get('/api/v1/shortlist').set('Authorization', auth(tutor.token));
    expect(res.status).toBe(403);
    expect((await request(app).get('/api/v1/shortlist')).status).toBe(401);
  });
});

describe('recommendations', () => {
  it('scores tutors by verification, budget, experience and area', () => {
    const base = { verificationStatus: 'VERIFIED', hourlyRate: 800, experienceYears: 10 };
    const full = scoreTutor({ ...base, areas: [{ id: 'a' }] }, { budget: 1000, areaId: 'a' });
    expect(full.score).toBe(100);
    expect(full.reasons).toContain('Within your budget');

    const weak = scoreTutor(
      { verificationStatus: 'UNVERIFIED', hourlyRate: 5000, experienceYears: 0, areas: [] },
      { budget: 1000 },
    );
    expect(weak.score).toBe(0);
    const near = scoreTutor({ ...base, hourlyRate: 1100, areas: [] }, { budget: 1000 });
    expect(near.reasons).toContain('Slightly above your budget');
  });

  it('is public, requires subjectId and ranks the better match first', async () => {
    expect((await request(app).get('/api/v1/tutors/recommended')).status).toBe(400);
    const cheap = await createTutor({ hourlyRate: 500, experienceYears: 8 });
    const pricey = await createTutor({ hourlyRate: 9000, experienceYears: 8 });

    const res = await request(app)
      .get('/api/v1/tutors/recommended')
      .query({ subjectId: subjects[0]?.id, budget: 600, limit: 20 });
    expect(res.status).toBe(200);
    const order = res.body.data.map((r: { tutor: { id: string } }) => r.tutor.id);
    expect(order).toContain(cheap.tutorId);
    if (order.includes(pricey.tutorId)) {
      expect(order.indexOf(cheap.tutorId)).toBeLessThan(order.indexOf(pricey.tutorId));
    }
    expect(res.body.data[0].tutor.email).toBeUndefined();
  });
});
