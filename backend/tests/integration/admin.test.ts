import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/shared/utils/password';

const app = createApp();
const prefix = `test-adm-${Date.now()}`;
let adminToken: string;
let studentToken: string;

async function login(email: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Secret123' });
  return res.body.data.accessToken as string;
}

beforeAll(async () => {
  const adminEmail = `${prefix}-admin@example.com`;
  await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: 'Test Admin',
      role: 'ADMIN',
      passwordHash: await hashPassword('Secret123'),
    },
  });
  adminToken = await login(adminEmail);
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `${prefix}-stu@example.com`,
      password: 'Secret123',
      fullName: 'Stu Dent',
      role: 'STUDENT',
    });
  studentToken = res.body.data.accessToken;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('GET /api/v1/admin/stats', () => {
  it('is admin only', async () => {
    expect((await request(app).get('/api/v1/admin/stats')).status).toBe(401);
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('returns platform counts and a 14-day signup series', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.users.total).toBeGreaterThanOrEqual(2);
    expect(d.users.byRole.ADMIN).toBeGreaterThanOrEqual(1);
    expect(d.signups).toHaveLength(14);
    expect(
      d.signups.reduce((a: number, s: { count: number }) => a + s.count, 0),
    ).toBeGreaterThanOrEqual(2);
    expect(d.courses.enrollments).toBeTypeOf('number');
    expect(d.classes.upcoming).toBeTypeOf('number');
  });
});
