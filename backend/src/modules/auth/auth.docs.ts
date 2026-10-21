const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const sessionResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSession' } } },
  headers: {
    'Set-Cookie': {
      description: 'httpOnly refresh token cookie (path /api/v1/auth)',
      schema: { type: 'string' },
    },
  },
});

export const authSchemas = {
  PublicUser: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      fullName: { type: 'string' },
      phone: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['STUDENT', 'PARENT', 'TUTOR', 'ADMIN'] },
      status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] },
      emailVerified: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  AuthSession: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/PublicUser' },
          accessToken: {
            type: 'string',
            description: 'JWT, send as "Authorization: Bearer <token>"',
          },
        },
      },
    },
  },
  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'fullName', 'role'],
    properties: {
      email: { type: 'string', format: 'email', example: 'ali@example.com' },
      password: { type: 'string', minLength: 8, example: 'Secret123' },
      fullName: { type: 'string', example: 'Ali Khan' },
      phone: { type: 'string', example: '03001234567' },
      role: { type: 'string', enum: ['STUDENT', 'PARENT', 'TUTOR'] },
    },
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'ali@example.com' },
      password: { type: 'string', example: 'Secret123' },
    },
  },
};

export const authPaths = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a student, parent or tutor',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
        },
      },
      responses: {
        '201': sessionResponse('Account created and logged in'),
        '400': { $ref: '#/components/responses/BadRequest' },
        '409': errorResponse('Email already registered'),
        '429': errorResponse('Too many attempts'),
      },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Log in with email and password',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
      },
      responses: {
        '200': sessionResponse('Logged in'),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': errorResponse('Invalid email or password'),
        '403': errorResponse('Account suspended'),
        '429': errorResponse('Too many attempts'),
      },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Get a new access token using the refresh cookie',
      description:
        'The refresh token is rotated: the old one stops working. Reusing an old one revokes every session of that user.',
      responses: {
        '200': sessionResponse('New access token and rotated refresh cookie'),
        '401': errorResponse('Missing, invalid, expired or reused refresh token'),
      },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Log out (revokes the refresh token)',
      responses: { '200': { description: 'Logged out' } },
    },
  },
  '/api/v1/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'The logged-in user',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/PublicUser' } },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
};
