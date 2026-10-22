import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis } from '../../src/config/redis';
import { getNotificationQueue } from '../../src/jobs/queues/notification.queue';
import { searchCache } from '../../src/modules/search/search.cache';

const app = createApp();
const prefix = `test-mat-${Date.now()}`;
let counter = 0;
const bearer = (token: string) => `Bearer ${token}`;
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

async function verifiedTutor() {
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

const api = (method: 'get' | 'post' | 'delete', url: string, who?: Actor) => {
  const r = request(app)[method](`/api/v1${url}`);
  return who ? r.set('Authorization', bearer(who.token)) : r;
};

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const SLIDES_PDF = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    '4 0 obj<</Length 60>>stream',
    'BT /F1 18 Tf 20 100 Td (Photosynthesis makes glucose) Tj ET',
    'endstream endobj',
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'trailer<</Root 1 0 R/Size 6>>',
    '%%EOF',
  ].join('\n'),
);

let tutor: Actor;
let courseId: string;
let lessonId: string;

beforeAll(async () => {
  subjectId = (await prisma.subject.findFirstOrThrow()).id;
  tutor = await verifiedTutor();
  const course = await api('post', '/courses', tutor).send({
    title: 'Biology slides course',
    description: 'A course that comes with slides for every lesson of the syllabus.',
    subjectId,
    level: 'BEGINNER',
    price: 0,
  });
  courseId = course.body.data.course.id;
  const lesson = await api('post', `/courses/${courseId}/lessons`, tutor).send({
    title: 'Plants',
    content: 'Plants make food.',
    durationMin: 10,
  });
  lessonId = lesson.body.data.lesson.id;
  await api('post', `/courses/${courseId}/publish`, tutor);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await getNotificationQueue().close();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('lesson materials', () => {
  it('lets only the owner upload, and only enrolled students read', async () => {
    const student = await register('STUDENT');
    const outsider = await register('STUDENT');
    const path = `/courses/${courseId}/lessons/${lessonId}/materials`;

    expect((await api('post', path, student).attach('file', PNG, 'a.png')).status).toBe(403);
    expect((await api('post', path, tutor)).status).toBe(400);
    expect(
      (await api('post', path, tutor).attach('file', Buffer.from('MZ binary'), 'x.exe')).status,
    ).toBe(400);

    const up = await api('post', path, tutor).attach('file', SLIDES_PDF, 'slides.pdf');
    expect(up.status).toBe(201);
    const materialId = up.body.data.material.id as string;
    expect(up.body.data.material.mimeType).toBe('application/pdf');
    expect(up.body.data.material).not.toHaveProperty('storedName');

    await api('post', `/courses/${courseId}/enroll`, student);
    const file = `${path}/${materialId}/file`;
    expect((await api('get', file)).status).toBe(401);
    expect((await api('get', file, outsider)).status).toBe(403);
    const read = await api('get', file, student);
    expect(read.status).toBe(200);
    expect(read.headers['content-disposition']).toBe('inline');

    const lesson = await api('get', `/courses/${courseId}/lessons/${lessonId}`, student);
    expect(lesson.body.data.lesson.materials).toHaveLength(1);

    const row = await prisma.lessonMaterial.findUniqueOrThrow({ where: { id: materialId } });
    expect(row.extractedText).toContain('Photosynthesis');

    expect((await api('delete', `${path}/${materialId}`, student)).status).toBe(403);
    expect((await api('delete', `${path}/${materialId}`, tutor)).status).toBe(200);
    expect((await api('get', file, student)).status).toBe(404);
  });

  it('feeds slide text to the assistant', async () => {
    const student = await register('STUDENT');
    await api('post', `/courses/${courseId}/lessons/${lessonId}/materials`, tutor).attach(
      'file',
      SLIDES_PDF,
      'slides.pdf',
    );
    await api('post', `/courses/${courseId}/enroll`, student);
    const res = await api('post', `/courses/${courseId}/assistant`, student).send({
      question: 'What does photosynthesis make?',
    });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.data)).toContain('glucose');
  });
});

describe('profile pictures', () => {
  it('uploads, serves publicly and removes', async () => {
    const user = await register('STUDENT');
    expect((await api('post', '/users/me/avatar', user)).status).toBe(400);
    expect(
      (await api('post', '/users/me/avatar', user).attach('file', SLIDES_PDF, 'a.pdf')).status,
    ).toBe(400);

    const up = await api('post', '/users/me/avatar', user).attach('file', PNG, 'me.png');
    expect(up.status).toBe(200);
    expect(up.body.data.user.avatarUrl).toContain(`/users/${user.id}/avatar`);

    const pub = await api('get', `/users/${user.id}/avatar`);
    expect(pub.status).toBe(200);
    expect(pub.headers['content-type']).toContain('image/png');

    expect((await api('delete', '/users/me/avatar', user)).status).toBe(200);
    expect((await api('get', `/users/${user.id}/avatar`)).status).toBe(404);
  });
});

describe('request status with a tutor', () => {
  it('reports pending after a request is sent', async () => {
    const student = await register('STUDENT');
    const profile = await prisma.tutorProfile.findUniqueOrThrow({ where: { userId: tutor.id } });
    expect((await api('get', `/requests/mine/tutor/${profile.id}`, student)).body.data.status).toBe(
      null,
    );
    await prisma.tutorRequest.create({
      data: {
        studentId: student.id,
        tutorProfileId: profile.id,
        subjectId,
        mode: 'ONLINE',
        message: 'Please help me prepare for the exam.',
      },
    });
    const res = await api('get', `/requests/mine/tutor/${profile.id}`, student);
    expect(res.body.data.status).toBe('PENDING');
  });
});
