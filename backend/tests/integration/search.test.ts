import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { disconnectRedis, redis } from '../../src/config/redis';
import { searchCache } from '../../src/modules/search/search.cache';
import { hashPassword } from '../../src/shared/utils/password';

const app = createApp();
const prefix = `test-search-${Date.now()}`;
// A unique marker so results only contain tutors created by this file.
const marker = `zq${Date.now()}`;
let counter = 0;
const bearer = (token: string) => `Bearer ${token}`;

let subjects: { id: string; name: string }[];
let areas: { id: string; name: string }[];
const tutors: Record<string, { token: string; tutorId: string; userId: string }> = {};

async function createTutor(
  key: string,
  profile: Record<string, unknown>,
  fullName = `Tutor ${key}`,
) {
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `${prefix}-${++counter}@example.com`,
      password: 'Secret123',
      fullName,
      role: 'TUTOR',
    });
  const token = reg.body.data.accessToken as string;
  const res = await request(app)
    .put('/api/v1/tutors/me')
    .set('Authorization', bearer(token))
    .send({
      headline: `${marker} ${key} tutor for students`,
      bio: 'I teach with a focus on exam preparation, concepts and regular practice.',
      qualification: 'MSc',
      experienceYears: 2,
      hourlyRate: 1000,
      teachingMode: 'ONLINE',
      subjectIds: [subjects[0]?.id],
      areaIds: [],
      isPublished: true,
      ...profile,
    });
  tutors[key] = { token, tutorId: res.body.data.tutor.id, userId: reg.body.data.user.id };
}

const search = (params: Record<string, string | number | boolean> = {}) =>
  request(app)
    .get('/api/v1/tutors')
    .query({ q: marker, ...params });

const ids = (res: request.Response) => res.body.data.map((t: { id: string }) => t.id);

beforeAll(async () => {
  subjects = await prisma.subject.findMany({ take: 2, orderBy: { name: 'asc' } });
  areas = await prisma.area.findMany({ take: 2, orderBy: { name: 'asc' } });

  await createTutor('cheap', { hourlyRate: 500, experienceYears: 1, teachingMode: 'ONLINE' });
  await createTutor('mid', {
    hourlyRate: 1000,
    experienceYears: 5,
    teachingMode: 'HOME',
    areaIds: [areas[0]?.id],
    subjectIds: [subjects[1]?.id],
  });
  await createTutor('pricey', {
    hourlyRate: 2000,
    experienceYears: 10,
    teachingMode: 'BOTH',
    areaIds: [areas[1]?.id],
  });
  await createTutor('draft', { isPublished: false });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await searchCache.invalidate();
  await prisma.$disconnect();
  await disconnectRedis();
});

describe('GET /api/v1/tutors (search)', () => {
  it('is public and returns published tutors only, without contact details', async () => {
    const res = await search();

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3);
    expect(ids(res)).not.toContain(tutors.draft?.tutorId);
    expect(JSON.stringify(res.body)).not.toContain('@example.com');
    expect(res.body.data[0]).toHaveProperty('fullName');
    expect(res.body.data[0]).not.toHaveProperty('bio');
  });

  it('filters by price range', async () => {
    const res = await search({ minRate: 800, maxRate: 1500 });
    expect(ids(res)).toEqual([tutors.mid?.tutorId]);
  });

  it('filters by minimum experience', async () => {
    const res = await search({ minExperience: 5, sort: 'experience' });
    expect(ids(res)).toEqual([tutors.pricey?.tutorId, tutors.mid?.tutorId]);
  });

  it('teaching mode HOME also matches BOTH, ONLINE also matches BOTH', async () => {
    const home = await search({ mode: 'HOME' });
    expect(ids(home).sort()).toEqual([tutors.mid?.tutorId, tutors.pricey?.tutorId].sort());

    const online = await search({ mode: 'ONLINE' });
    expect(ids(online).sort()).toEqual([tutors.cheap?.tutorId, tutors.pricey?.tutorId].sort());
  });

  it('filters by subject and by area', async () => {
    const bySubject = await search({ subjectId: subjects[1]?.id ?? '' });
    expect(ids(bySubject)).toEqual([tutors.mid?.tutorId]);

    const byArea = await search({ areaId: areas[1]?.id ?? '' });
    expect(ids(byArea)).toEqual([tutors.pricey?.tutorId]);
  });

  it('sorts by price ascending and descending', async () => {
    const asc = await search({ sort: 'priceAsc' });
    expect(ids(asc)).toEqual([tutors.cheap?.tutorId, tutors.mid?.tutorId, tutors.pricey?.tutorId]);

    const desc = await search({ sort: 'priceDesc' });
    expect(ids(desc)).toEqual([tutors.pricey?.tutorId, tutors.mid?.tutorId, tutors.cheap?.tutorId]);
  });

  it('searches text in the tutor name (case-insensitive)', async () => {
    const res = await request(app).get('/api/v1/tutors').query({ q: 'TUTOR CHEAP' });
    expect(ids(res)).toContain(tutors.cheap?.tutorId);
  });

  it('paginates', async () => {
    const res = await search({ sort: 'priceAsc', limit: 2, page: 2 });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it.each([
    ['minRate above maxRate', { minRate: 2000, maxRate: 100 }],
    ['limit above 50', { limit: 500 }],
    ['unknown sort', { sort: 'cheapestfirst' }],
    ['invalid subject id', { subjectId: 'nope' }],
    ['invalid verifiedOnly', { verifiedOnly: 'maybe' }],
  ])('rejects %s with 400', async (_name, params) => {
    expect((await search(params)).status).toBe(400);
  });
});

describe('search only shows verified tutors when asked, and reacts to changes', () => {
  it('verifiedOnly hides unverified tutors', async () => {
    const res = await search({ verifiedOnly: true });
    expect(ids(res)).not.toContain(tutors.cheap?.tutorId);
  });

  it('hides a suspended tutor immediately (cache is invalidated)', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `${prefix}-admin@example.com`,
        fullName: 'Admin',
        role: 'ADMIN',
        passwordHash: await hashPassword('Secret123'),
      },
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'Secret123' });

    const before = await search();
    expect(ids(before)).toContain(tutors.cheap?.tutorId);

    const suspend = await request(app)
      .patch(`/api/v1/users/${tutors.cheap?.userId}/status`)
      .set('Authorization', bearer(login.body.data.accessToken))
      .send({ status: 'SUSPENDED' });
    expect(suspend.status).toBe(200);

    expect(ids(await search())).not.toContain(tutors.cheap?.tutorId);
  });

  it('shows profile edits immediately instead of a stale cached page', async () => {
    const before = await search({ maxRate: 1200 });
    expect(ids(before)).toContain(tutors.mid?.tutorId);

    await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutors.mid?.token ?? ''))
      .send({
        headline: `${marker} mid tutor for students`,
        bio: 'I teach with a focus on exam preparation, concepts and regular practice.',
        qualification: 'MSc',
        experienceYears: 5,
        hourlyRate: 1800,
        teachingMode: 'HOME',
        subjectIds: [subjects[1]?.id],
        areaIds: [areas[0]?.id],
        isPublished: true,
      });

    expect(ids(await search({ maxRate: 1200 }))).not.toContain(tutors.mid?.tutorId);
  });
});

describe('Redis cache', () => {
  it('stores the result in Redis and serves repeated requests from it', async () => {
    await searchCache.invalidate();
    const params = { q: marker, sort: 'priceDesc', limit: 7 };
    const first = await request(app).get('/api/v1/tutors').query(params);
    expect(first.status).toBe(200);

    const version = (await redis.get('cache:tutor-search:version')) ?? '0';
    const keys = await redis.keys(`cache:tutor-search:v${version}:*`);
    expect(keys.length).toBeGreaterThan(0);

    // Tamper with the cached value: if it is served back, the request came from Redis.
    const key = keys[0] as string;
    const cached = JSON.parse((await redis.get(key)) as string);
    const sentinel = { ...cached, meta: { ...cached.meta, total: 424242 } };
    await redis.set(key, JSON.stringify(sentinel), 'EX', 30);

    const matching = await Promise.all(
      keys.map(async (k) => {
        const value = JSON.parse((await redis.get(k)) as string);
        return value.meta.total === 424242 ? k : null;
      }),
    );
    expect(matching.filter(Boolean)).toHaveLength(1);

    const second = await request(app).get('/api/v1/tutors').query(params);
    expect(second.body.meta.total).toBe(424242);
  });

  it('treats the same filters in a different order as the same cache entry', async () => {
    await searchCache.invalidate();
    await request(app).get('/api/v1/tutors?q=' + marker + '&sort=priceAsc&limit=5');
    await request(app).get('/api/v1/tutors?limit=5&sort=priceAsc&q=' + marker);

    const version = (await redis.get('cache:tutor-search:version')) ?? '0';
    expect(await redis.keys(`cache:tutor-search:v${version}:*`)).toHaveLength(1);
  });

  it('sets an expiry so entries never live forever', async () => {
    await searchCache.invalidate();
    await request(app).get('/api/v1/tutors').query({ q: marker, limit: 3 });
    const version = (await redis.get('cache:tutor-search:version')) ?? '0';
    const [key] = await redis.keys(`cache:tutor-search:v${version}:*`);
    const ttl = await redis.ttl(key as string);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });
});

describe('when Redis is unavailable', () => {
  it('still answers from the database', async () => {
    await disconnectRedis();
    const res = await search({ sort: 'priceAsc' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
