import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

const app = createApp();

describe('API docs', () => {
  it('serves a valid OpenAPI document', async () => {
    const res = await request(app).get('/api/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths['/health']).toBeDefined();
  });

  it('serves the Swagger UI page', async () => {
    const res = await request(app).get('/api/docs/').redirects(1);

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
