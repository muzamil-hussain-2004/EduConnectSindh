import { prisma } from '../../config/database';
import type { NotificationType, Prisma } from '../../database/generated/prisma/client';

const select = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export const notificationsRepository = {
  userExists: async (id: string) => (await prisma.user.count({ where: { id } })) > 0,

  create: (input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) => prisma.notification.create({ data: input, select }),

  list: async (userId: string, unreadOnly: boolean | undefined, page: number, limit: number) => {
    const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        select,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  },

  unreadCount: (userId: string) => prisma.notification.count({ where: { userId, readAt: null } }),

  findOwned: (id: string, userId: string) =>
    prisma.notification.findFirst({ where: { id, userId }, select }),

  markRead: (id: string, userId: string) =>
    prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    }),

  markAllRead: (userId: string) =>
    prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    }),
};
