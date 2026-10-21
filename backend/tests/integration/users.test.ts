import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/shared/utils/password';

const app = createApp();
const prefix = `test-users-${Date.now()}`;
let counter = 0;
const newEmail = () => `${prefix}-${++counter}@example.com`;

async function registerUser(role: 'STUDENT' | 'TUTOR' = 'STUDENT') {
  const email = newEmail();
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'Secret123', fullName: 'Test User', role });
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return {
    email,
    id: res.body.data.user.id as string,
    token: res.body.data.accessToken as string,
    cookie: (cookies.find((c) => c.startsWith('refreshToken=')) as string).split(';')[0] as string,
  };
}

let admin: { id: string; token: string };

beforeAll(async () => {
  const email = newEmail();
  const adminUser = await prisma.user.create({
    data: {
      email,
      fullName: 'Test Admin',
      role: 'ADMIN',
      passwordHash: await hashPassword('Secret123'),
    },
  });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Secret123' });
  admin = { id: adminUser.id, token: res.body.data.accessToken };
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

const bearer = (token: string) => `Bearer ${token}`;

describe('PATCH /api/v1/users/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ fullName: 'X Y' });
    expect(res.status).toBe(401);
  });

  it('updates name and phone, and can clear the phone', async () => {
    const user = await registerUser();
    const updated = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', bearer(user.token))
      .send({ fullName: 'New Name', phone: '03111234567' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.user).toMatchObject({ fullName: 'New Name', phone: '03111234567' });
    expect(updated.body.data.user.passwordHash).toBeUndefined();

    const cleared = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', bearer(user.token))
      .send({ phone: null });
    expect(cleared.body.data.user.phone).toBeNull();
  });

  it('ignores attempts to change role or email', async () => {
    const user = await registerUser();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', bearer(user.token))
      .send({ fullName: 'Still Me', role: 'ADMIN', email: 'hacker@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(res.body.data.user.email).toBe(user.email);
  });

  it.each([
    ['empty body', {}],
    ['invalid phone', { phone: '123' }],
    ['too short name', { fullName: 'A' }],
  ])('rejects %s with 400', async (_name, body) => {
    const user = await registerUser();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', bearer(user.token))
      .send(body);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/users/me/password', () => {
  it('changes the password and revokes existing sessions', async () => {
    const user = await registerUser();
    const res = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', bearer(user.token))
      .send({ currentPassword: 'Secret123', newPassword: 'Another456' });
    expect(res.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Secret123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Another456' });
    expect(newLogin.status).toBe(200);

    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie);
    expect(refresh.status).toBe(401);
  });

  it('rejects a wrong current password and a reused password', async () => {
    const user = await registerUser();
    const wrong = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', bearer(user.token))
      .send({ currentPassword: 'Nope12345', newPassword: 'Another456' });
    expect(wrong.status).toBe(400);

    const same = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', bearer(user.token))
      .send({ currentPassword: 'Secret123', newPassword: 'Secret123' });
    expect(same.status).toBe(400);
  });

  it('rejects a weak new password', async () => {
    const user = await registerUser();
    const res = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', bearer(user.token))
      .send({ currentPassword: 'Secret123', newPassword: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/users (admin)', () => {
  it('is forbidden for non-admins and unauthorized without a token', async () => {
    const user = await registerUser();
    const forbidden = await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer(user.token));
    expect(forbidden.status).toBe(403);

    const anonymous = await request(app).get('/api/v1/users');
    expect(anonymous.status).toBe(401);
  });

  it('paginates and filters by role and search', async () => {
    const tutor = await registerUser('TUTOR');
    await registerUser('STUDENT');

    const res = await request(app)
      .get('/api/v1/users')
      .query({ role: 'TUTOR', search: prefix, limit: 1 })
      .set('Authorization', bearer(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(tutor.id);
    expect(res.body.data[0].passwordHash).toBeUndefined();
    expect(res.body.meta).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
  });

  it('rejects invalid query params with 400', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .query({ limit: 1000 })
      .set('Authorization', bearer(admin.token));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/users/:id/status (admin)', () => {
  it('is forbidden for non-admins', async () => {
    const user = await registerUser();
    const other = await registerUser();
    const res = await request(app)
      .patch(`/api/v1/users/${other.id}/status`)
      .set('Authorization', bearer(user.token))
      .send({ status: 'SUSPENDED' });
    expect(res.status).toBe(403);
  });

  it('suspends a user, blocks login and refresh, then reactivates', async () => {
    const user = await registerUser();
    const suspend = await request(app)
      .patch(`/api/v1/users/${user.id}/status`)
      .set('Authorization', bearer(admin.token))
      .send({ status: 'SUSPENDED' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.user.status).toBe('SUSPENDED');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Secret123' });
    expect(login.status).toBe(403);

    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie);
    expect(refresh.status).toBe(401);

    const activate = await request(app)
      .patch(`/api/v1/users/${user.id}/status`)
      .set('Authorization', bearer(admin.token))
      .send({ status: 'ACTIVE' });
    expect(activate.body.data.user.status).toBe('ACTIVE');

    const loginAgain = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Secret123' });
    expect(loginAgain.status).toBe(200);
  });

  it('protects admins and yourself, and handles unknown or invalid ids', async () => {
    const self = await request(app)
      .patch(`/api/v1/users/${admin.id}/status`)
      .set('Authorization', bearer(admin.token))
      .send({ status: 'SUSPENDED' });
    expect(self.status).toBe(400);

    const missing = await request(app)
      .patch('/api/v1/users/00000000-0000-4000-8000-000000000000/status')
      .set('Authorization', bearer(admin.token))
      .send({ status: 'SUSPENDED' });
    expect(missing.status).toBe(404);

    const invalid = await request(app)
      .patch('/api/v1/users/not-a-uuid/status')
      .set('Authorization', bearer(admin.token))
      .send({ status: 'SUSPENDED' });
    expect(invalid.status).toBe(400);

    const badStatus = await request(app)
      .patch(`/api/v1/users/${admin.id}/status`)
      .set('Authorization', bearer(admin.token))
      .send({ status: 'DELETED' });
    expect(badStatus.status).toBe(400);
  });
});
