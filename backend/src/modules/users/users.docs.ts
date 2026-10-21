const security = [{ bearerAuth: [] }];

const userEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'object',
      properties: { user: { $ref: '#/components/schemas/PublicUser' } },
    },
  },
};

const json = (schema: unknown) => ({ 'application/json': { schema } });

export const usersSchemas = {
  UpdateProfileRequest: {
    type: 'object',
    properties: {
      fullName: { type: 'string', example: 'Ali Raza' },
      phone: { type: 'string', nullable: true, example: '03001234567' },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string' },
      newPassword: { type: 'string', minLength: 8, example: 'NewSecret123' },
    },
  },
  UpdateStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] } },
  },
  UserList: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'array', items: { $ref: '#/components/schemas/PublicUser' } },
      meta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
};

export const usersPaths = {
  '/api/v1/users/me': {
    patch: {
      tags: ['Users'],
      summary: 'Update my profile (name, phone)',
      security,
      requestBody: {
        required: true,
        content: json({ $ref: '#/components/schemas/UpdateProfileRequest' }),
      },
      responses: {
        '200': { description: 'Updated profile', content: json(userEnvelope) },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/v1/users/me/password': {
    post: {
      tags: ['Users'],
      summary: 'Change my password (logs out all devices)',
      security,
      requestBody: {
        required: true,
        content: json({ $ref: '#/components/schemas/ChangePasswordRequest' }),
      },
      responses: {
        '200': { description: 'Password changed' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/v1/users': {
    get: {
      tags: ['Users'],
      summary: 'List users (admin only)',
      security,
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        {
          name: 'role',
          in: 'query',
          schema: { type: 'string', enum: ['STUDENT', 'PARENT', 'TUTOR', 'ADMIN'] },
        },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] } },
        {
          name: 'search',
          in: 'query',
          description: 'Matches name or email',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Paginated users',
          content: json({ $ref: '#/components/schemas/UserList' }),
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/api/v1/users/{id}/status': {
    patch: {
      tags: ['Users'],
      summary: 'Suspend or reactivate a user (admin only)',
      security,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: json({ $ref: '#/components/schemas/UpdateStatusRequest' }),
      },
      responses: {
        '200': { description: 'Updated user', content: json(userEnvelope) },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
