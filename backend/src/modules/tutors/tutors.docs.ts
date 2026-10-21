const security = [{ bearerAuth: [] }];
const json = (schema: unknown) => ({ 'application/json': { schema } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const tutorEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'object', properties: { tutor: ref('Tutor') } },
  },
};

const idName = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } },
};

export const tutorsSchemas = {
  IdName: idName,
  Tutor: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      fullName: { type: 'string' },
      headline: { type: 'string', example: 'MSc Physics, 5 years teaching experience' },
      bio: { type: 'string' },
      qualification: { type: 'string', example: 'MSc Physics, University of Sindh' },
      experienceYears: { type: 'integer' },
      hourlyRate: { type: 'integer', description: 'PKR per hour', example: 1000 },
      teachingMode: { type: 'string', enum: ['HOME', 'ONLINE', 'BOTH'] },
      isPublished: { type: 'boolean' },
      verificationStatus: {
        type: 'string',
        enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
      },
      subjects: { type: 'array', items: ref('IdName') },
      areas: { type: 'array', items: ref('IdName') },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  TutorProfileRequest: {
    type: 'object',
    required: [
      'headline',
      'bio',
      'qualification',
      'experienceYears',
      'hourlyRate',
      'teachingMode',
      'subjectIds',
    ],
    properties: {
      headline: { type: 'string' },
      bio: { type: 'string', minLength: 30 },
      qualification: { type: 'string' },
      experienceYears: { type: 'integer', minimum: 0 },
      hourlyRate: { type: 'integer', minimum: 100, maximum: 20000 },
      teachingMode: { type: 'string', enum: ['HOME', 'ONLINE', 'BOTH'] },
      subjectIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      areaIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      isPublished: { type: 'boolean', default: false },
    },
  },
};

export const tutorsPaths = {
  '/api/v1/tutors/me': {
    get: {
      tags: ['Tutors'],
      summary: 'Get my tutor profile (tutor only)',
      security,
      responses: {
        '200': { description: 'My profile', content: json(tutorEnvelope) },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
    put: {
      tags: ['Tutors'],
      summary: 'Create or replace my tutor profile (tutor only)',
      security,
      requestBody: { required: true, content: json(ref('TutorProfileRequest')) },
      responses: {
        '200': { description: 'Saved profile', content: json(tutorEnvelope) },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/api/v1/tutors/{id}': {
    get: {
      tags: ['Tutors'],
      summary: 'View a published tutor profile (public)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': { description: 'Tutor profile', content: json(tutorEnvelope) },
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/v1/catalog/cities': {
    get: {
      tags: ['Catalog'],
      summary: 'Cities with their areas (public)',
      responses: { '200': { description: 'List of cities, each with areas' } },
    },
  },
  '/api/v1/catalog/subjects': {
    get: {
      tags: ['Catalog'],
      summary: 'All subjects (public)',
      responses: { '200': { description: 'List of subjects' } },
    },
  },
};
