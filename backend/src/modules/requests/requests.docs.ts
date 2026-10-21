const secured = [{ bearerAuth: [] }];
const idParam = (name: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
});
const ok = (description: string) => ({ '200': { description } });
const errors = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
  '409': { description: 'Request is no longer pending, or a duplicate' },
};

export const requestsSchemas = {
  CreateRequestInput: {
    type: 'object',
    required: ['tutorId', 'subjectId', 'mode', 'message'],
    properties: {
      tutorId: { type: 'string', format: 'uuid' },
      subjectId: { type: 'string', format: 'uuid' },
      areaId: { type: 'string', format: 'uuid', description: 'Required for HOME lessons' },
      mode: { type: 'string', enum: ['HOME', 'ONLINE'] },
      budgetPerHour: { type: 'integer', minimum: 100, maximum: 20000 },
      message: { type: 'string', minLength: 10, maxLength: 1000 },
    },
  },
  RespondInput: {
    type: 'object',
    properties: { note: { type: 'string', maxLength: 500 } },
  },
};

export const requestsPaths = {
  '/api/v1/requests': {
    post: {
      tags: ['Requests'],
      summary: 'Send a tutoring request (student or parent)',
      security: secured,
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CreateRequestInput' } },
        },
      },
      responses: { '201': { description: 'Request created' }, ...errors },
    },
  },
  '/api/v1/requests/mine': {
    get: {
      tags: ['Requests'],
      summary: 'My sent requests (contact details appear once accepted)',
      security: secured,
      responses: { ...ok('Paginated requests'), ...errors },
    },
  },
  '/api/v1/requests/incoming': {
    get: {
      tags: ['Requests'],
      summary: 'Requests received by the tutor',
      security: secured,
      responses: { ...ok('Paginated requests'), ...errors },
    },
  },
  '/api/v1/requests/{id}/accept': {
    post: {
      tags: ['Requests'],
      summary: 'Accept a pending request (tutor)',
      security: secured,
      parameters: [idParam('id')],
      responses: { ...ok('Accepted; student contact details are now shared'), ...errors },
    },
  },
  '/api/v1/requests/{id}/decline': {
    post: {
      tags: ['Requests'],
      summary: 'Decline a pending request (tutor)',
      security: secured,
      parameters: [idParam('id')],
      responses: { ...ok('Declined'), ...errors },
    },
  },
  '/api/v1/requests/{id}/cancel': {
    post: {
      tags: ['Requests'],
      summary: 'Cancel my pending request',
      security: secured,
      parameters: [idParam('id')],
      responses: { ...ok('Cancelled'), ...errors },
    },
  },
  '/api/v1/shortlist': {
    get: {
      tags: ['Shortlist'],
      summary: 'My saved tutors',
      security: secured,
      responses: { ...ok('Saved tutors'), ...errors },
    },
  },
  '/api/v1/shortlist/{id}': {
    put: {
      tags: ['Shortlist'],
      summary: 'Save a tutor (idempotent)',
      security: secured,
      parameters: [idParam('id')],
      responses: { ...ok('Saved'), ...errors },
    },
    delete: {
      tags: ['Shortlist'],
      summary: 'Remove a saved tutor',
      security: secured,
      parameters: [idParam('id')],
      responses: { ...ok('Removed'), ...errors },
    },
  },
  '/api/v1/tutors/recommended': {
    get: {
      tags: ['Recommendations'],
      summary: 'Best-matching tutors for a subject (public)',
      description:
        'Score out of 100: verified 35, within budget 30, experience up to 20, teaches in your area 15. Each result lists its reasons.',
      parameters: [
        { name: 'subjectId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'areaId', in: 'query', schema: { type: 'string' } },
        { name: 'mode', in: 'query', schema: { type: 'string', enum: ['HOME', 'ONLINE'] } },
        { name: 'budget', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 5, maximum: 20 } },
      ],
      responses: { ...ok('Scored tutors'), '400': { $ref: '#/components/responses/BadRequest' } },
    },
  },
};
