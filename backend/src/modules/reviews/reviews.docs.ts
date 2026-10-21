const secured = [{ bearerAuth: [] }];
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const paging = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
];
const errors = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
};

export const reviewsSchemas = {
  ReviewInput: {
    type: 'object',
    required: ['rating', 'comment'],
    properties: {
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      comment: { type: 'string', minLength: 10, maxLength: 1000 },
    },
  },
};

export const reviewsPaths = {
  '/api/v1/tutors/{id}/reviews': {
    get: {
      tags: ['Reviews'],
      summary: 'Visible reviews of a tutor (public)',
      parameters: [idParam, ...paging],
      responses: {
        '200': { description: 'Paginated reviews, newest first' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Reviews'],
      summary: 'Create or edit my review (needs an accepted request)',
      security: secured,
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewInput' } } },
      },
      responses: { '200': { description: 'Saved' }, ...errors },
    },
    delete: {
      tags: ['Reviews'],
      summary: 'Delete my review',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Deleted' }, ...errors },
    },
  },
  '/api/v1/reviews': {
    get: {
      tags: ['Reviews'],
      summary: 'Moderation queue (admin)',
      security: secured,
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['VISIBLE', 'HIDDEN'] } },
        ...paging,
      ],
      responses: { '200': { description: 'Paginated reviews with status' }, ...errors },
    },
  },
  '/api/v1/reviews/{id}/hide': {
    post: {
      tags: ['Reviews'],
      summary: 'Hide a review and remove it from the rating (admin)',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Hidden' }, ...errors },
    },
  },
  '/api/v1/reviews/{id}/unhide': {
    post: {
      tags: ['Reviews'],
      summary: 'Make a hidden review visible again (admin)',
      security: secured,
      parameters: [idParam],
      responses: { '200': { description: 'Visible' }, ...errors },
    },
  },
};
