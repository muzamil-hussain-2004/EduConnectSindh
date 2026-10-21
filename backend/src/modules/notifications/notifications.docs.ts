const secured = [{ bearerAuth: [] }];
const errors = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '404': { $ref: '#/components/responses/NotFound' },
};

export const notificationsPaths = {
  '/api/v1/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'My notifications, newest first',
      description:
        'Notifications are also pushed live over Socket.IO (event "notification") while the user is online; this endpoint returns everything, including what was missed offline.',
      security: secured,
      parameters: [
        { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
      ],
      responses: { '200': { description: 'Paginated notifications' }, ...errors },
    },
  },
  '/api/v1/notifications/unread-count': {
    get: {
      tags: ['Notifications'],
      summary: 'Number of unread notifications (for the bell badge)',
      security: secured,
      responses: { '200': { description: '{ count }' }, ...errors },
    },
  },
  '/api/v1/notifications/read-all': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark all my notifications as read',
      security: secured,
      responses: { '200': { description: '{ updated }' }, ...errors },
    },
  },
  '/api/v1/notifications/{id}/read': {
    post: {
      tags: ['Notifications'],
      summary: 'Mark one notification as read',
      security: secured,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { '200': { description: 'Updated notification' }, ...errors },
    },
  },
};
