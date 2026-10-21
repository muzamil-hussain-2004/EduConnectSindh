import { logger } from '../../config/logger';
import type { NotificationJob } from '../../jobs/queues/notification.queue';
import { getNotificationQueue } from '../../jobs/queues/notification.queue';
import { emitToUser } from '../../sockets/socket.server';
import { AppError } from '../../shared/errors/AppError';
import { notificationsRepository } from './notifications.repository';
import type { ListNotificationsQuery } from './notifications.schema';

export const notificationsService = {
  // Called by other modules. It must never break the action that triggered it
  // (a request being sent must succeed even if notifying fails), so it never throws.
  async notify(job: NotificationJob) {
    try {
      await getNotificationQueue().add(job.type, job);
    } catch (err) {
      // Redis down: deliver right now instead of losing the notification.
      logger.warn({ err: (err as Error).message }, 'Queue unavailable, delivering inline');
      await this.deliver(job).catch((e) =>
        logger.error({ err: (e as Error).message }, 'Notification delivery failed'),
      );
    }
  },

  // Runs inside the worker: save to PostgreSQL first (so it is never lost),
  // then push to the user's live sockets (a bonus for users who are online).
  async deliver(job: NotificationJob) {
    // The user may have been deleted while the job waited in the queue.
    if (!(await notificationsRepository.userExists(job.userId))) return null;
    const notification = await notificationsRepository.create(job);
    emitToUser(job.userId, 'notification', notification);
    return notification;
  },

  async list(userId: string, { page, limit, unreadOnly }: ListNotificationsQuery) {
    const { items, total } = await notificationsRepository.list(userId, unreadOnly, page, limit);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  unreadCount: (userId: string) => notificationsRepository.unreadCount(userId),

  async markRead(userId: string, id: string) {
    // Other people's notifications look like they do not exist.
    if (!(await notificationsRepository.findOwned(id, userId))) {
      throw AppError.notFound('Notification not found');
    }
    await notificationsRepository.markRead(id, userId);
    return notificationsRepository.findOwned(id, userId);
  },

  async markAllRead(userId: string) {
    return (await notificationsRepository.markAllRead(userId)).count;
  },
};
