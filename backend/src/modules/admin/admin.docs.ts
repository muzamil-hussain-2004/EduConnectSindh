export const adminPaths = {
  '/api/v1/admin/stats': {
    get: {
      tags: ['Admin'],
      summary: 'Platform overview counts and 14-day signups (admin)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description:
            '{ users, tutors, courses, classes, requests, reviews, signups: [{date,count}] }',
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};
