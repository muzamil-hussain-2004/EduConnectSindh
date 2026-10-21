import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authenticate, authorize } from '../../src/middlewares/auth.middleware';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { signAccessToken } from '../../src/shared/utils/token';

const app = express();
app.get('/admin-only', authenticate, authorize('ADMIN'), (_req, res) => {
  res.json({ ok: true });
});
app.get('/tutor-or-admin', authenticate, authorize('TUTOR', 'ADMIN'), (_req, res) => {
  res.json({ ok: true });
});
app.use(errorHandler);

const tokenFor = (role: 'STUDENT' | 'PARENT' | 'TUTOR' | 'ADMIN') =>
  `Bearer ${signAccessToken({ id: 'user-1', role })}`;

describe('role-based access control', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/admin-only');
    expect(res.status).toBe(401);
  });

  it('returns 403 when the role is not allowed', async () => {
    const res = await request(app).get('/admin-only').set('Authorization', tokenFor('TUTOR'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows the right role', async () => {
    const res = await request(app).get('/admin-only').set('Authorization', tokenFor('ADMIN'));
    expect(res.status).toBe(200);
  });

  it('allows any of several roles', async () => {
    const tutor = await request(app).get('/tutor-or-admin').set('Authorization', tokenFor('TUTOR'));
    const student = await request(app)
      .get('/tutor-or-admin')
      .set('Authorization', tokenFor('STUDENT'));

    expect(tutor.status).toBe(200);
    expect(student.status).toBe(403);
  });
});
