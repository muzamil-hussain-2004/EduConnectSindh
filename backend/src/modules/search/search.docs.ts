const q = (name: string, schema: Record<string, unknown>, description?: string) => ({
  name,
  in: 'query',
  ...(description ? { description } : {}),
  schema,
});

export const searchSchemas = {
  TutorSummary: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      fullName: { type: 'string' },
      headline: { type: 'string' },
      qualification: { type: 'string' },
      experienceYears: { type: 'integer' },
      hourlyRate: { type: 'integer', description: 'PKR per hour' },
      teachingMode: { type: 'string', enum: ['HOME', 'ONLINE', 'BOTH'] },
      verificationStatus: {
        type: 'string',
        enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
      },
      subjects: { type: 'array', items: { $ref: '#/components/schemas/IdName' } },
      areas: { type: 'array', items: { $ref: '#/components/schemas/IdName' } },
    },
  },
  TutorSearchResult: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'array', items: { $ref: '#/components/schemas/TutorSummary' } },
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

export const searchPaths = {
  '/api/v1/tutors': {
    get: {
      tags: ['Search'],
      summary: 'Search published tutors (public)',
      description:
        'Only published tutors with an active account appear. Results are cached in Redis for 60 seconds and the cache is cleared whenever a profile, verification or account status changes.',
      parameters: [
        q('q', { type: 'string' }, 'Matches name, headline, bio or subject name'),
        q('subjectId', { type: 'string', format: 'uuid' }),
        q('areaId', { type: 'string', format: 'uuid' }),
        q(
          'mode',
          { type: 'string', enum: ['HOME', 'ONLINE'] },
          'Also matches tutors who teach BOTH',
        ),
        q('minRate', { type: 'integer' }, 'Minimum PKR per hour'),
        q('maxRate', { type: 'integer' }, 'Maximum PKR per hour'),
        q('minExperience', { type: 'integer' }, 'Minimum years of experience'),
        q('verifiedOnly', { type: 'boolean' }),
        q('sort', {
          type: 'string',
          enum: ['newest', 'priceAsc', 'priceDesc', 'experience'],
          default: 'newest',
        }),
        q('page', { type: 'integer', default: 1 }),
        q('limit', { type: 'integer', default: 12, maximum: 50 }),
      ],
      responses: {
        '200': {
          description: 'Paginated tutors',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/TutorSearchResult' } },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
};
