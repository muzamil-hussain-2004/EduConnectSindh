const errors = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '404': { $ref: '#/components/responses/NotFound' },
};

export const assistantSchemas = {
  AskInput: {
    type: 'object',
    required: ['question'],
    properties: {
      question: { type: 'string', minLength: 3, maxLength: 500 },
      lessonId: { type: 'string', format: 'uuid', description: 'Lesson the student is reading' },
    },
  },
};

export const assistantPaths = {
  '/api/v1/courses/{id}/assistant': {
    post: {
      tags: ['Assistant'],
      summary: 'Ask the course assistant (owner, enrolled student, admin)',
      description:
        'Answers only from the course lessons. Uses an OpenAI-compatible model when AI_API_KEY is set, otherwise a built-in keyword search over the lessons. Rate limited per user.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/AskInput' } } },
      },
      responses: {
        '200': {
          description: '{ answer, sources: [{lessonId,title}], provider: "llm" | "local" }',
        },
        '429': { description: 'Too many questions' },
        ...errors,
      },
    },
  },
};
