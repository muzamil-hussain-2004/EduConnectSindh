import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis } from '../../src/config/redis';
import { searchCache } from '../../src/modules/search/search.cache';
import { hashPassword } from '../../src/shared/utils/password';

const app = createApp();
const prefix = `test-rev-${Date.now()}`;
let counter = 0;
const auth = (token: string) => `Bearer ${token}`;

let subjectId: string;
let admin: { token: string };

type Actor = { token: string; id: string; tutorId?: string };

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
  const res = await request(app)
    .put('/api/v1/tutors/me')
    .set('Authorization', auth(tutor.token))
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
  tutor.tutorId = res.body.data.tutor.id;
  return tutor;
}

// Student with an ACCEPTED request to the tutor, so they are allowed to review.
async function studentWithAccepted(tutor: Actor) {
  const student = await register('STUDENT');
  const sent = await request(app)
    .post('/api/v1/requests')
    .set('Authorization', auth(student.token))
    .send({
      tutorId: tutor.tutorId,
      subjectId,
      mode: 'ONLINE',
      message: 'I need help preparing for my exams.',
    });
  await request(app)
    .post(`/api/v1/requests/${sent.body.data.request.id}/accept`)
    .set('Authorization', auth(tutor.token));
  return student;
}

const review = (student: Actor, tutor: Actor, body: Record<string, unknown>) =>
  request(app)
    .put(`/api/v1/tutors/${tutor.tutorId}/reviews`)
    .set('Authorization', auth(student.token))
    .send(body);

const ratingOf = async (tutor: Actor) =>
  prisma.tutorProfile.findUniqueOrThrow({
    where: { id: tutor.tutorId },
    select: { ratingAvg: true, ratingCount: true },
  });

beforeAll(async () => {
  subjectId = (await prisma.subject.findFirstOrThrow()).id;
  const email = `${prefix}-admin@example.com`;
  await prisma.user.create({
    data: {
      email,
      fullName: 'Admin',
      role: 'ADMIN',
      passwordHash: await hashPassword('Secret123'),
    },
  });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Secret123' });
  admin = { token: res.body.data.accessToken };
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('reviews', () => {
  it('only lets people with an accepted request review, and validates input', async () => {
    const tutor = await createTutor();
    const stranger = await register('STUDENT');
    const body = { rating: 5, comment: 'Explains everything very clearly.' };

    expect((await review(stranger, tutor, body)).status).toBe(403);
    expect(
      (await request(app).put(`/api/v1/tutors/${tutor.tutorId}/reviews`).send(body)).status,
    ).toBe(401);
    expect((await review(tutor, tutor, body)).status).toBe(403);

    const student = await studentWithAccepted(tutor);
    expect((await review(student, tutor, { ...body, rating: 6 })).status).toBe(400);
    expect((await review(student, tutor, { ...body, rating: 4.5 })).status).toBe(400);
    expect((await review(student, tutor, { ...body, comment: 'short' })).status).toBe(400);
    expect((await review(student, tutor, body)).status).toBe(200);
  });

  it('a pending request is not enough', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    await request(app)
      .post('/api/v1/requests')
      .set('Authorization', auth(student.token))
      .send({ tutorId: tutor.tutorId, subjectId, mode: 'ONLINE', message: 'Please help me out.' });
    expect(
      (await review(student, tutor, { rating: 5, comment: 'Not allowed yet at all.' })).status,
    ).toBe(403);
  });

  it('keeps one review per author (edit replaces) and updates the average', async () => {
    const tutor = await createTutor();
    const a = await studentWithAccepted(tutor);
    const b = await studentWithAccepted(tutor);

    await review(a, tutor, { rating: 5, comment: 'Excellent teacher, highly recommended.' });
    await review(b, tutor, { rating: 3, comment: 'Decent sessions but a bit rushed.' });
    expect(await ratingOf(tutor)).toEqual({ ratingAvg: 4, ratingCount: 2 });

    await review(b, tutor, { rating: 4, comment: 'Got better after some feedback.' });
    expect(await ratingOf(tutor)).toEqual({ ratingAvg: 4.5, ratingCount: 2 });
    expect(await prisma.review.count({ where: { tutorProfileId: tutor.tutorId } })).toBe(2);

    const list = await request(app).get(`/api/v1/tutors/${tutor.tutorId}/reviews`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.meta.total).toBe(2);
    expect(list.body.data[0].moderationNote).toBeUndefined();
    expect(list.body.data[0].authorName).toBeDefined();
  });

  it('lets the author delete, and recalculates', async () => {
    const tutor = await createTutor();
    const a = await studentWithAccepted(tutor);
    await review(a, tutor, { rating: 2, comment: 'Not what I was expecting here.' });
    const del = () =>
      request(app)
        .delete(`/api/v1/tutors/${tutor.tutorId}/reviews`)
        .set('Authorization', auth(a.token));
    expect((await del()).status).toBe(200);
    expect(await ratingOf(tutor)).toEqual({ ratingAvg: 0, ratingCount: 0 });
    expect((await del()).status).toBe(404);
  });

  it('admin can hide and unhide; hidden reviews leave the public list and the average', async () => {
    const tutor = await createTutor();
    const a = await studentWithAccepted(tutor);
    const b = await studentWithAccepted(tutor);
    const first = await review(a, tutor, { rating: 5, comment: 'Wonderful tutor, great results.' });
    await review(b, tutor, { rating: 1, comment: 'Rude and abusive language here.' });
    const abusiveId = (
      await prisma.review.findFirstOrThrow({ where: { tutorProfileId: tutor.tutorId, rating: 1 } })
    ).id;

    expect(first.status).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/v1/reviews/${abusiveId}/hide`)
          .set('Authorization', auth(a.token))
      ).status,
    ).toBe(403);

    const hide = await request(app)
      .post(`/api/v1/reviews/${abusiveId}/hide`)
      .set('Authorization', auth(admin.token))
      .send({ note: 'Abusive language' });
    expect(hide.body.data.review.status).toBe('HIDDEN');
    expect(await ratingOf(tutor)).toEqual({ ratingAvg: 5, ratingCount: 1 });
    const publicList = await request(app).get(`/api/v1/tutors/${tutor.tutorId}/reviews`);
    expect(publicList.body.data).toHaveLength(1);

    // Editing a hidden review must not bring it back.
    await review(b, tutor, { rating: 1, comment: 'Edited but still hidden review.' });
    expect(await ratingOf(tutor)).toEqual({ ratingAvg: 5, ratingCount: 1 });

    const queue = await request(app)
      .get('/api/v1/reviews')
      .query({ status: 'HIDDEN' })
      .set('Authorization', auth(admin.token));
    expect(queue.body.data.some((r: { id: string }) => r.id === abusiveId)).toBe(true);

    await request(app)
      .post(`/api/v1/reviews/${abusiveId}/unhide`)
      .set('Authorization', auth(admin.token));
    expect(await ratingOf(tutor)).toEqual({ ratingAvg: 3, ratingCount: 2 });
    expect(
      (
        await request(app)
          .post(`/api/v1/reviews/${abusiveId.replace(/.$/, '0')}/hide`)
          .set('Authorization', auth(admin.token))
      ).status,
    ).toBe(404);
  });

  it('returns 404 for the reviews of an unpublished tutor', async () => {
    const tutor = await createTutor();
    await prisma.tutorProfile.update({
      where: { id: tutor.tutorId },
      data: { isPublished: false },
    });
    expect((await request(app).get(`/api/v1/tutors/${tutor.tutorId}/reviews`)).status).toBe(404);
  });

  it('feeds search: rating in results, minRating filter and rating sort', async () => {
    const good = await createTutor();
    const poor = await createTutor();
    const s1 = await studentWithAccepted(good);
    const s2 = await studentWithAccepted(poor);
    await review(s1, good, { rating: 5, comment: 'Absolutely the best tutor ever.' });
    await review(s2, poor, { rating: 2, comment: 'Could be better in many ways.' });

    const res = await request(app)
      .get('/api/v1/tutors')
      .query({ minRating: 4, sort: 'rating', subjectId, limit: 50 });
    const ids = res.body.data.map((t: { id: string }) => t.id);
    expect(ids).toContain(good.tutorId);
    expect(ids).not.toContain(poor.tutorId);
    const found = res.body.data.find((t: { id: string }) => t.id === good.tutorId);
    expect(found.ratingAvg).toBe(5);
    expect(found.ratingCount).toBe(1);

    const sorted = await request(app)
      .get('/api/v1/tutors')
      .query({ sort: 'rating', subjectId, limit: 50 });
    const order = sorted.body.data.map((t: { id: string }) => t.id);
    expect(order.indexOf(good.tutorId)).toBeLessThan(order.indexOf(poor.tutorId));
    expect((await request(app).get('/api/v1/tutors').query({ minRating: 9 })).status).toBe(400);
  });
});
