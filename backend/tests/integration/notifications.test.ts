import type { AddressInfo } from 'node:net';
import http from 'node:http';
import type { Worker } from 'bullmq';
import { io as connect, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis } from '../../src/config/redis';
import { getNotificationQueue } from '../../src/jobs/queues/notification.queue';
import { startNotificationWorker } from '../../src/jobs/workers/notification.worker';
import { closeSocketServer, initSocketServer } from '../../src/sockets/socket.server';
import { searchCache } from '../../src/modules/search/search.cache';

const app = createApp();
const prefix = `test-notif-${Date.now()}`;
let counter = 0;
const auth = (token: string) => `Bearer ${token}`;

let server: http.Server;
let url: string;
let worker: Worker;
let subjectId: string;
const sockets: Socket[] = [];

type Actor = { token: string; id: string; tutorId?: string };

async function register(role: 'STUDENT' | 'TUTOR'): Promise<Actor> {
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

const sendRequest = (student: Actor, tutor: Actor) =>
  request(app).post('/api/v1/requests').set('Authorization', auth(student.token)).send({
    tutorId: tutor.tutorId,
    subjectId,
    mode: 'ONLINE',
    message: 'I need help preparing for my exams.',
  });

async function listen(actor: Actor) {
  const socket = connect(url, { auth: { token: actor.token }, transports: ['websocket'] });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
  return socket;
}

const nextNotification = (socket: Socket) =>
  new Promise<{ type: string; title: string }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No notification received')), 8000);
    socket.once('notification', (n) => {
      clearTimeout(timer);
      resolve(n);
    });
  });

async function waitFor<T>(fn: () => Promise<T | undefined | false>, timeoutMs = 8000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

const myNotifications = (actor: Actor, query: Record<string, string> = {}) =>
  request(app).get('/api/v1/notifications').query(query).set('Authorization', auth(actor.token));

beforeAll(async () => {
  subjectId = (await prisma.subject.findFirstOrThrow()).id;
  // Start from a clean test queue so leftovers from other test files cannot interfere.
  await getNotificationQueue().obliterate({ force: true });
  server = http.createServer(app);
  initSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
  worker = startNotificationWorker();
  await worker.waitUntilReady();
});

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await worker.close();
  await closeSocketServer();
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('socket authentication', () => {
  it('rejects connections without a valid token', async () => {
    const bad = connect(url, { auth: { token: 'not-a-jwt' }, transports: ['websocket'] });
    sockets.push(bad);
    const err = await new Promise<Error>((resolve) => bad.once('connect_error', resolve));
    expect(err.message).toBe('Unauthorized');

    const none = connect(url, { transports: ['websocket'] });
    sockets.push(none);
    const err2 = await new Promise<Error>((resolve) => none.once('connect_error', resolve));
    expect(err2.message).toBe('Unauthorized');
  });
});

describe('notifications', () => {
  it('pushes live events through the queue and worker, and saves them', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const tutorSocket = await listen(tutor);
    const studentSocket = await listen(student);

    const received = nextNotification(tutorSocket);
    const sent = await sendRequest(student, tutor);
    expect((await received).type).toBe('REQUEST_RECEIVED');

    expect(
      (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', auth(tutor.token))
      ).body.data.count,
    ).toBe(1);
    const list = await myNotifications(tutor);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].data.requestId).toBe(sent.body.data.request.id);
    expect(list.body.data[0].readAt).toBeNull();

    // The student gets a different event when the tutor responds.
    const accepted = nextNotification(studentSocket);
    await request(app)
      .post(`/api/v1/requests/${sent.body.data.request.id}/accept`)
      .set('Authorization', auth(tutor.token));
    expect((await accepted).type).toBe('REQUEST_ACCEPTED');

    const read = await request(app)
      .post(`/api/v1/notifications/${list.body.data[0].id}/read`)
      .set('Authorization', auth(tutor.token));
    expect(read.body.data.notification.readAt).not.toBeNull();
    expect((await myNotifications(tutor, { unreadOnly: 'true' })).body.data).toHaveLength(0);
  });

  it('keeps notifications for users who are offline', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    await sendRequest(student, tutor);

    const found = await waitFor(async () => {
      const res = await myNotifications(tutor);
      return res.body.data.length > 0 ? res : false;
    });
    expect(found.body.data[0].type).toBe('REQUEST_RECEIVED');
  });

  it('does not leak notifications between users', async () => {
    const tutor = await createTutor();
    const other = await createTutor();
    const student = await register('STUDENT');
    await sendRequest(student, tutor);
    const mine = await waitFor(async () => {
      const res = await myNotifications(tutor);
      return res.body.data.length > 0 ? res : false;
    });

    expect((await myNotifications(other)).body.data).toHaveLength(0);
    const steal = await request(app)
      .post(`/api/v1/notifications/${mine.body.data[0].id}/read`)
      .set('Authorization', auth(other.token));
    expect(steal.status).toBe(404);
    expect((await request(app).get('/api/v1/notifications')).status).toBe(401);
  });

  it('marks all as read', async () => {
    const tutor = await createTutor();
    for (let i = 0; i < 2; i++) await sendRequest(await register('STUDENT'), tutor);
    await waitFor(async () => (await myNotifications(tutor)).body.meta.total === 2);

    const res = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', auth(tutor.token));
    expect(res.body.data.updated).toBe(2);
    expect(
      (
        await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', auth(tutor.token))
      ).body.data.count,
    ).toBe(0);
  });

  it('notifies the tutor about a new review, but only once per author', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const sent = await sendRequest(student, tutor);
    await request(app)
      .post(`/api/v1/requests/${sent.body.data.request.id}/accept`)
      .set('Authorization', auth(tutor.token));

    const put = (rating: number) =>
      request(app)
        .put(`/api/v1/tutors/${tutor.tutorId}/reviews`)
        .set('Authorization', auth(student.token))
        .send({ rating, comment: 'Very helpful and patient teacher.' });
    await put(5);
    await put(4);

    const res = await waitFor(async () => {
      const r = await myNotifications(tutor);
      return r.body.data.some((n: { type: string }) => n.type === 'REVIEW_RECEIVED') ? r : false;
    });
    const reviewNotes = res.body.data.filter((n: { type: string }) => n.type === 'REVIEW_RECEIVED');
    expect(reviewNotes).toHaveLength(1);
  });

  it('still delivers (inline) when the queue is unavailable', async () => {
    const tutor = await createTutor();
    const student = await register('STUDENT');
    const spy = vi
      .spyOn(getNotificationQueue(), 'add')
      .mockRejectedValueOnce(new Error('Redis is down'));

    const sent = await sendRequest(student, tutor);
    expect(sent.status).toBe(201);
    expect(spy).toHaveBeenCalled();
    const res = await myNotifications(tutor);
    expect(res.body.data).toHaveLength(1);
    spy.mockRestore();
  });
});
