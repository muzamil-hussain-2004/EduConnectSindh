import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';

const app = createApp();
const prefix = `test-auth-${Date.now()}`;
let counter = 0;
const newEmail = () => `${prefix}-${++counter}@example.com`;

const validUser = (overrides: Record<string, unknown> = {}) => ({
  email: newEmail(),
  password: 'Secret123',
  fullName: 'Test User',
  role: 'STUDENT',
  ...overrides,
});

const refreshCookieOf = (res: request.Response): string => {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((c) => c.startsWith('refreshToken='));
  if (!cookie) throw new Error('No refresh cookie in response');
  return cookie;
};
const cookiePair = (cookie: string) => cookie.split(';')[0] as string;

afterAll(async () => {
  // refresh_tokens are removed by ON DELETE CASCADE
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('POST /api/v1/auth/register', () => {
  it('creates an account and returns a session', async () => {
    const body = validUser({ role: 'TUTOR', phone: '03001234567' });
    const res = await request(app).post('/api/v1/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      email: body.email,
      role: 'TUTOR',
      status: 'ACTIVE',
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();

    const cookie = refreshCookieOf(res);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');
  });

  it('stores a hashed password, never the plain one', async () => {
    const body = validUser();
    await request(app).post('/api/v1/auth/register').send(body);

    const stored = await prisma.user.findUnique({ where: { email: body.email } });
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored?.passwordHash).not.toContain(body.password);
  });

  it('rejects a duplicate email (case-insensitive) with 409', async () => {
    const body = validUser();
    await request(app).post('/api/v1/auth/register').send(body);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...body, email: body.email.toUpperCase() });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it.each([
    ['weak password', { password: 'short' }],
    ['password without a number', { password: 'onlyletters' }],
    ['invalid email', { email: 'not-an-email' }],
    ['invalid phone', { phone: '12345' }],
    ['self-registering as ADMIN', { role: 'ADMIN' }],
    ['unknown role', { role: 'SUPERUSER' }],
  ])('rejects %s with 400', async (_name, overrides) => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/login', () => {
  const user = validUser();

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(user);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email.toUpperCase(), password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookieOf(res)).toContain('HttpOnly');
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'WrongPass1' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: newEmail(), password: 'WrongPass1' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('blocks suspended accounts with 403', async () => {
    const suspended = validUser();
    await request(app).post('/api/v1/auth/register').send(suspended);
    await prisma.user.update({ where: { email: suspended.email }, data: { status: 'SUSPENDED' } });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: suspended.email, password: suspended.password });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const body = validUser();
    const registered = await request(app).post('/api/v1/auth/register').send(body);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(body.email);
  });
});

describe('refresh token rotation', () => {
  const login = async () => {
    const body = validUser();
    const res = await request(app).post('/api/v1/auth/register').send(body);
    return { body, cookie: cookiePair(refreshCookieOf(res)) };
  };

  it('issues a new access token and rotates the refresh token', async () => {
    const { cookie } = await login();
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(cookiePair(refreshCookieOf(res))).not.toBe(cookie);
  });

  it('rejects a request without a cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('detects reuse of an old token and revokes the whole session family', async () => {
    const { cookie: first } = await login();
    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', first);
    const second = cookiePair(refreshCookieOf(rotated));

    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', first);
    expect(reuse.status).toBe(401);

    const afterReuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', second);
    expect(afterReuse.status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const { cookie } = await login();
    const out = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});
