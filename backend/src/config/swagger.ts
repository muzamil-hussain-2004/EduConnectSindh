import { authPaths, authSchemas } from '../modules/auth/auth.docs';
import { env } from './env';

// Each module will export its own `paths` and we merge them here as we build them.
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'EduConnect Sindh API',
    version: '0.1.0',
    description:
      'REST API for the EduConnect Sindh tutor discovery, verification and online learning platform.',
  },
  servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local development' }],
  tags: [
    { name: 'System', description: 'Health and diagnostics' },
    { name: 'Auth', description: 'Registration, login, tokens' },
  ],
  paths: {
    ...authPaths,
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Reports whether the API and its database are reachable.',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
                example: {
                  status: 'ok',
                  database: 'up',
                  uptime: 120,
                  timestamp: '2026-10-21T08:30:52.599Z',
                },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ...authSchemas,
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          database: { type: 'string', example: 'up' },
          uptime: { type: 'integer', description: 'Seconds since the server started' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'NOT_FOUND' },
              message: { type: 'string', example: 'Resource not found' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Validation failed or malformed request',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Missing or invalid access token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Authenticated but not allowed (wrong role)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      InternalError: {
        description: 'Unexpected server error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
};
