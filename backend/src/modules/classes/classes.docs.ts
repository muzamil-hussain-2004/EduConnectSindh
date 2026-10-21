const secured = [{ bearerAuth: [] }];
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const errors = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
};
const op = (summary: string, extra: Record<string, unknown> = {}, auth = true) => ({
  tags: ['Classes'],
  summary,
  ...(auth ? { security: secured } : {}),
  ...extra,
});

export const classesSchemas = {
  ClassInput: {
    type: 'object',
    required: ['title', 'startsAt', 'meetingUrl'],
    properties: {
      title: { type: 'string', minLength: 3, maxLength: 120 },
      description: { type: 'string', maxLength: 1000 },
      startsAt: { type: 'string', format: 'date-time', description: 'Must be in the future' },
      durationMin: { type: 'integer', minimum: 15, maximum: 240 },
      meetingUrl: { type: 'string', format: 'uri', description: 'https link (Meet, Zoom, ...)' },
      capacity: { type: 'integer', minimum: 1, maximum: 200 },
      courseId: { type: 'string', format: 'uuid', nullable: true },
    },
  },
};

export const classesPaths = {
  '/api/v1/classes': {
    get: op(
      'Upcoming classes (public; no meeting link)',
      {
        parameters: [
          { name: 'courseId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'tutorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Paginated classes, soonest first' } },
      },
      false,
    ),
    post: op('Schedule a class (tutor); notifies students of the linked course', {
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ClassInput' } } },
      },
      responses: { '201': { description: 'Scheduled' }, ...errors },
    }),
  },
  '/api/v1/classes/mine': {
    get: op('My classes, past and future (tutor)', {
      responses: { '200': { description: 'Classes' }, ...errors },
    }),
  },
  '/api/v1/classes/booked': {
    get: op('Classes I booked that have not started (student/parent)', {
      responses: { '200': { description: 'Classes' }, ...errors },
    }),
  },
  '/api/v1/classes/{id}': {
    get: op(
      'One class (public; no meeting link)',
      {
        parameters: [idParam],
        responses: { '200': { description: 'Class' }, '404': errors['404'] },
      },
      false,
    ),
    patch: op('Edit a future class (owner); notifies booked students on time/link change', {
      parameters: [idParam],
      responses: { '200': { description: 'Updated' }, ...errors },
    }),
  },
  '/api/v1/classes/{id}/join': {
    get: op('Meeting link (owner, booked student, admin)', {
      parameters: [idParam],
      responses: { '200': { description: '{ meetingUrl }' }, ...errors },
    }),
  },
  '/api/v1/classes/{id}/cancel': {
    post: op('Cancel a class (owner); notifies booked students', {
      parameters: [idParam],
      responses: { '200': { description: 'Cancelled' }, ...errors },
    }),
  },
  '/api/v1/classes/{id}/book': {
    post: op('Book a seat; 409 if full or already booked', {
      parameters: [idParam],
      responses: {
        '201': { description: 'Booked' },
        '409': { description: 'Full / duplicate' },
        ...errors,
      },
    }),
    delete: op('Release my seat', {
      parameters: [idParam],
      responses: { '200': { description: 'Released' }, ...errors },
    }),
  },
};
