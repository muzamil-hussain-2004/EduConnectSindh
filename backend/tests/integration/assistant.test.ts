import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis } from '../../src/config/redis';
import { searchCache } from '../../src/modules/search/search.cache';

const app = createApp();
const prefix = `test-ast-${Date.now()}`;
let counter = 0;
let subjectId: string;

type Actor = { token: string; id: string };

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

const api = (method: 'get' | 'post', url: string, who?: Actor) => {
  const r = request(app)[method](`/api/v1${url}`);
  return who ? r.set('Authorization', `Bearer ${who.token}`) : r;
};

beforeAll(async () => {
  subjectId = (await prisma.subject.findFirstOrThrow()).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('course assistant', () => {
  it('answers from lessons for enrolled students only', async () => {
    const tutor = await register('TUTOR');
    await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', `Bearer ${tutor.token}`)
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
    const student = await register('STUDENT');
    const outsider = await register('STUDENT');

    const course = await api('post', '/courses', tutor).send({
      title: 'Biology basics',
      description: 'A step by step course that covers the basics with practice.',
      subjectId,
    });
    const courseId = course.body.data.course.id;
    const lesson = await api('post', `/courses/${courseId}/lessons`, tutor).send({
      title: 'Photosynthesis',
      content:
        'Photosynthesis is the process where plants convert sunlight into chemical energy. Chlorophyll in the chloroplast absorbs light.',
    });
    const lessonId = lesson.body.data.lesson.id;
    await api('post', `/courses/${courseId}/lessons`, tutor).send({
      title: 'Cells',
      content: 'The nucleus controls the cell. Mitochondria release energy for the cell.',
    });
    await api('post', `/courses/${courseId}/publish`, tutor);
    await api('post', `/courses/${courseId}/enroll`, student);

    const ask = (who: Actor | undefined, body: object) =>
      api('post', `/courses/${courseId}/assistant`, who).send(body);

    expect((await ask(undefined, { question: 'What is photosynthesis?' })).status).toBe(401);
    expect((await ask(outsider, { question: 'What is photosynthesis?' })).status).toBe(403);
    expect((await ask(student, { question: 'hi' })).status).toBe(400);
    expect(
      (await ask(student, { question: 'What is chlorophyll?', lessonId: subjectId })).status,
    ).toBe(400);

    const ok = await ask(student, { question: 'What does chlorophyll absorb?', lessonId });
    expect(ok.status).toBe(200);
    expect(ok.body.data.provider).toBe('local');
    expect(ok.body.data.answer).toContain('Chlorophyll');
    expect(ok.body.data.sources[0].title).toBe('Photosynthesis');

    const none = await ask(student, { question: 'Explain quantum entanglement' });
    expect(none.status).toBe(200);
    expect(none.body.data.sources).toEqual([]);

    expect((await ask(tutor, { question: 'What is photosynthesis?' })).status).toBe(200);
    expect(
      (
        await api('post', `/courses/${randomUuid()}/assistant`, student).send({
          question: 'abc def',
        })
      ).status,
    ).toBe(404);
  });
});

function randomUuid() {
  return crypto.randomUUID();
}
