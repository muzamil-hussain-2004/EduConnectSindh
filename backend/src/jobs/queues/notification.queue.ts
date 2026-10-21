import { Queue } from 'bullmq';
import { BULL_PREFIX, createProducerConnection } from '../../config/queue';
import type { NotificationType } from '../../database/generated/prisma/client';

export const NOTIFICATION_QUEUE = 'notifications';

export interface NotificationJob {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

let queue: Queue<NotificationJob> | undefined;

// Created on first use so importing this file never opens a Redis connection by itself.
export function getNotificationQueue() {
  queue ??= new Queue<NotificationJob>(NOTIFICATION_QUEUE, {
    connection: createProducerConnection(),
    prefix: BULL_PREFIX,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  return queue;
}

export async function closeNotificationQueue() {
  const current = queue;
  queue = undefined;
  await current?.close().catch(() => undefined);
}
