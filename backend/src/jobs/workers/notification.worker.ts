import { Worker } from 'bullmq';
import { logger } from '../../config/logger';
import { BULL_PREFIX, createWorkerConnection } from '../../config/queue';
import { notificationsService } from '../../modules/notifications/notifications.service';
import type { NotificationJob } from '../queues/notification.queue';
import { NOTIFICATION_QUEUE } from '../queues/notification.queue';

// The worker pulls jobs from Redis and runs them. It can live in this process (as now)
// or later in a separate process just by calling this function there.
export function startNotificationWorker() {
  const worker = new Worker<NotificationJob>(
    NOTIFICATION_QUEUE,
    async (job) => {
      await notificationsService.deliver(job.data);
    },
    { connection: createWorkerConnection(), prefix: BULL_PREFIX, concurrency: 5 },
  );

  worker.on('failed', (job, err) =>
    logger.warn(
      { jobId: job?.id, attempt: job?.attemptsMade, err: err.message },
      'Notification job failed',
    ),
  );
  worker.on('error', (err) => logger.warn({ err: err.message }, 'Notification worker error'));
  return worker;
}
