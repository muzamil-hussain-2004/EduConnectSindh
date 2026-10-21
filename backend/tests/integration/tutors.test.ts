import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';

const app = createApp();
const prefix = `test-tutors-${Date.now()}`;
let counter = 0;

async function register(role: 'STUDENT' | 'TUTOR') {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `${prefix}-${++counter}@example.com`,
      password: 'Secret123',
      fullName: 'Test Tutor',
      phone: '03001234567',
      role,
    });
  return { token: res.body.data.accessToken as string };
}

const bearer = (token: string) => `Bearer ${token}`;

let subjectIds: string[];
let areaIds: string[];

const profile = (overrides: Record<string, unknown> = {}) => ({
  headline: 'MSc Physics, 5 years experience',
  bio: 'I teach physics and mathematics with a focus on exam preparation and concepts.',
  qualification: 'MSc Physics, University of Sindh',
  experienceYears: 5,
  hourlyRate: 1000,
  teachingMode: 'BOTH',
  subjectIds: subjectIds.slice(0, 2),
  areaIds: areaIds.slice(0, 2),
  isPublished: true,
  ...overrides,
});

beforeAll(async () => {
  subjectIds = (await prisma.subject.findMany({ take: 3 })).map((s) => s.id);
  areaIds = (await prisma.area.findMany({ take: 3 })).map((a) => a.id);
  if (subjectIds.length < 2 || areaIds.length < 2) throw new Error('Run `npm run db:seed` first');
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('catalog', () => {
  it('lists cities with areas and subjects publicly', async () => {
    const cities = await request(app).get('/api/v1/catalog/cities');
    expect(cities.status).toBe(200);
    expect(cities.body.data[0].areas.length).toBeGreaterThan(0);

    const subjects = await request(app).get('/api/v1/catalog/subjects');
    expect(subjects.status).toBe(200);
    expect(subjects.body.data.length).toBeGreaterThan(0);
  });
});

describe('PUT /api/v1/tutors/me', () => {
  it('requires a tutor account', async () => {
    const anonymous = await request(app).put('/api/v1/tutors/me').send(profile());
    expect(anonymous.status).toBe(401);

    const student = await register('STUDENT');
    const res = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(student.token))
      .send(profile());
    expect(res.status).toBe(403);
  });

  it('creates a profile, then updates it and replaces subjects and areas', async () => {
    const tutor = await register('TUTOR');
    const created = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile());

    expect(created.status).toBe(200);
    expect(created.body.data.tutor).toMatchObject({
      fullName: 'Test Tutor',
      hourlyRate: 1000,
      verificationStatus: 'UNVERIFIED',
      isPublished: true,
    });
    expect(created.body.data.tutor.subjects).toHaveLength(2);
    expect(created.body.data.tutor.areas).toHaveLength(2);

    const updated = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile({ hourlyRate: 1500, subjectIds: [subjectIds[2]], areaIds: [areaIds[2]] }));

    expect(updated.status).toBe(200);
    expect(updated.body.data.tutor.hourlyRate).toBe(1500);
    expect(updated.body.data.tutor.subjects.map((s: { id: string }) => s.id)).toEqual([
      subjectIds[2],
    ]);
    expect(updated.body.data.tutor.areas).toHaveLength(1);
    expect(await prisma.tutorProfile.count({ where: { id: created.body.data.tutor.id } })).toBe(1);
  });

  it('does not expose contact details', async () => {
    const tutor = await register('TUTOR');
    const res = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile());
    const text = JSON.stringify(res.body);

    expect(text).not.toContain('03001234567');
    expect(text).not.toContain('@example.com');
  });

  it('ignores an attempt to self-verify', async () => {
    const tutor = await register('TUTOR');
    const res = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile({ verificationStatus: 'VERIFIED' }));

    expect(res.status).toBe(200);
    expect(res.body.data.tutor.verificationStatus).toBe('UNVERIFIED');
  });

  it.each([
    ['short bio', { bio: 'too short' }],
    ['negative experience', { experienceYears: -1 }],
    ['rate too low', { hourlyRate: 10 }],
    ['fractional rate', { hourlyRate: 1000.5 }],
    ['no subjects', { subjectIds: [] }],
    ['invalid teaching mode', { teachingMode: 'TELEPATHY' }],
    ['unknown subject id', { subjectIds: ['00000000-0000-4000-8000-000000000000'] }],
    ['unknown area id', { areaIds: ['00000000-0000-4000-8000-000000000000'] }],
    ['home tutoring published without areas', { teachingMode: 'HOME', areaIds: [] }],
  ])('rejects %s with 400', async (_name, overrides) => {
    const tutor = await register('TUTOR');
    const res = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile(overrides));
    expect(res.status).toBe(400);
  });

  it('allows an online-only profile without areas', async () => {
    const tutor = await register('TUTOR');
    const res = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile({ teachingMode: 'ONLINE', areaIds: [] }));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/tutors/me', () => {
  it('returns 404 before a profile exists and the profile afterwards', async () => {
    const tutor = await register('TUTOR');
    const before = await request(app)
      .get('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token));
    expect(before.status).toBe(404);

    await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile());
    const after = await request(app)
      .get('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token));
    expect(after.status).toBe(200);
  });
});

describe('GET /api/v1/tutors/:id', () => {
  it('shows published profiles publicly and hides drafts', async () => {
    const tutor = await register('TUTOR');
    const draft = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile({ isPublished: false }));
    const id = draft.body.data.tutor.id as string;

    expect((await request(app).get(`/api/v1/tutors/${id}`)).status).toBe(404);

    await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send(profile({ isPublished: true }));
    const visible = await request(app).get(`/api/v1/tutors/${id}`);
    expect(visible.status).toBe(200);
    expect(visible.body.data.tutor.id).toBe(id);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    expect((await request(app).get('/api/v1/tutors/not-a-uuid')).status).toBe(400);
    expect(
      (await request(app).get('/api/v1/tutors/00000000-0000-4000-8000-000000000000')).status,
    ).toBe(404);
  });
});
