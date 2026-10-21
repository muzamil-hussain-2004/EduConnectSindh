const secured = [{ bearerAuth: [] }];
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const lessonParam = {
  name: 'lessonId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const errors = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
};
const jsonBody = (ref: string) => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } },
});
const op = (summary: string, extra: Record<string, unknown> = {}, auth = true) => ({
  tags: ['Courses'],
  summary,
  ...(auth ? { security: secured } : {}),
  ...extra,
});

export const coursesSchemas = {
  CourseInput: {
    type: 'object',
    required: ['title', 'description', 'subjectId'],
    properties: {
      title: { type: 'string', minLength: 5, maxLength: 120 },
      description: { type: 'string', minLength: 20, maxLength: 3000 },
      subjectId: { type: 'string', format: 'uuid' },
      level: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
      price: { type: 'integer', minimum: 0, maximum: 100000, description: 'PKR; 0 = free' },
    },
  },
  LessonInput: {
    type: 'object',
    required: ['title', 'content'],
    properties: {
      title: { type: 'string', minLength: 3, maxLength: 120 },
      content: { type: 'string', minLength: 10, maxLength: 20000 },
      videoUrl: { type: 'string', format: 'uri', description: 'https only' },
      durationMin: { type: 'integer', minimum: 1, maximum: 600 },
    },
  },
};

export const coursesPaths = {
  '/api/v1/courses': {
    get: op(
      'Browse published courses (public)',
      {
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'subjectId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'level', in: 'query', schema: { type: 'string' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'integer' } },
          { name: 'freeOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', enum: ['newest', 'popular', 'priceAsc', 'priceDesc'] },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12, maximum: 50 } },
        ],
        responses: { '200': { description: 'Paginated courses' } },
      },
      false,
    ),
    post: op('Create a draft course (tutor)', {
      requestBody: jsonBody('CourseInput'),
      responses: { '201': { description: 'Created' }, ...errors },
    }),
  },
  '/api/v1/courses/mine': {
    get: op('My courses, drafts included (tutor)', {
      responses: { '200': { description: 'Courses' }, ...errors },
    }),
  },
  '/api/v1/courses/{id}': {
    get: op(
      'Published course outline (public, no lesson content)',
      {
        parameters: [idParam],
        responses: { '200': { description: 'Course' }, '404': errors['404'] },
      },
      false,
    ),
    patch: op('Edit my course (tutor)', {
      parameters: [idParam],
      responses: { '200': { description: 'Updated' }, ...errors },
    }),
    delete: op('Delete my course; 409 if students are enrolled (tutor)', {
      parameters: [idParam],
      responses: {
        '200': { description: 'Deleted' },
        '409': { description: 'Has enrollments' },
        ...errors,
      },
    }),
  },
  '/api/v1/courses/{id}/manage': {
    get: op('Full course with lesson content (owner)', {
      parameters: [idParam],
      responses: { '200': { description: 'Course' }, ...errors },
    }),
  },
  '/api/v1/courses/{id}/publish': {
    post: op('Publish; needs at least one lesson (owner)', {
      parameters: [idParam],
      responses: { '200': { description: 'Published' }, ...errors },
    }),
  },
  '/api/v1/courses/{id}/unpublish': {
    post: op('Back to draft (owner)', {
      parameters: [idParam],
      responses: { '200': { description: 'Unpublished' }, ...errors },
    }),
  },
  '/api/v1/courses/{id}/lessons': {
    post: op('Add a lesson at the end (owner)', {
      parameters: [idParam],
      requestBody: jsonBody('LessonInput'),
      responses: { '201': { description: 'Created' }, ...errors },
    }),
  },
  '/api/v1/courses/{id}/lessons/{lessonId}': {
    get: op('Read a lesson (owner, enrolled student or admin)', {
      parameters: [idParam, lessonParam],
      responses: { '200': { description: 'Lesson with content' }, ...errors },
    }),
    patch: op('Edit a lesson (owner)', {
      parameters: [idParam, lessonParam],
      responses: { '200': { description: 'Updated' }, ...errors },
    }),
    delete: op('Delete a lesson (owner)', {
      parameters: [idParam, lessonParam],
      responses: { '200': { description: 'Deleted' }, ...errors },
    }),
  },
  '/api/v1/courses/{id}/enroll': {
    post: op('Enroll (student/parent); notifies the tutor', {
      parameters: [idParam],
      responses: {
        '201': { description: 'Enrolled' },
        '409': { description: 'Already enrolled' },
        ...errors,
      },
    }),
    delete: op('Leave a course (student/parent)', {
      parameters: [idParam],
      responses: { '200': { description: 'Left' }, ...errors },
    }),
  },
  '/api/v1/courses/{id}/enrollment': {
    get: op('My enrollment state and progress (student/parent)', {
      parameters: [idParam],
      responses: {
        '200': { description: '{ enrolled, completedLessonIds, progress }' },
        ...errors,
      },
    }),
  },
  '/api/v1/courses/{id}/lessons/{lessonId}/complete': {
    post: op('Mark lesson complete (enrolled)', {
      parameters: [idParam, lessonParam],
      responses: { '200': { description: 'Updated progress' }, ...errors },
    }),
    delete: op('Unmark lesson complete (enrolled)', {
      parameters: [idParam, lessonParam],
      responses: { '200': { description: 'Updated progress' }, ...errors },
    }),
  },
  '/api/v1/enrollments/mine': {
    get: op('My learning: enrolled courses with progress', {
      responses: { '200': { description: 'Paginated enrollments' }, ...errors },
    }),
  },
};
