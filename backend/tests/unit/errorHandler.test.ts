import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler, notFoundHandler } from '../../src/middlewares/error.middleware';
import { AppError } from '../../src/shared/errors/AppError';

// A tiny app with throwing routes: tests the error handler without any database.
const app = express();
app.use(express.json());
app.get('/forbidden', () => {
  throw AppError.forbidden();
});
app.get('/async-not-found', async () => {
  throw AppError.notFound('Tutor not found');
});
app.post('/validate', (req, res) => {
  z.object({ email: z.email() }).parse(req.body);
  res.json({ ok: true });
});
app.get('/crash', () => {
  throw new Error('db exploded');
});
app.use(notFoundHandler);
app.use(errorHandler);

describe('error handler', () => {
  it('maps AppError to its status and code', async () => {
    const res = await request(app).get('/forbidden');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('catches errors thrown inside async handlers (Express 5)', async () => {
    const res = await request(app).get('/async-not-found');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Tutor not found');
  });

  it('returns per-field details for Zod validation errors', async () => {
    const res = await request(app).post('/validate').send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('email');
  });

  it('turns unexpected errors into a 500', async () => {
    const res = await request(app).get('/crash');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
