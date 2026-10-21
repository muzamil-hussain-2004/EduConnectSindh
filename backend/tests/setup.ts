import { afterAll } from 'vitest';
import { closeNotificationQueue } from '../src/jobs/queues/notification.queue';

// Any test that triggers a notification opens a BullMQ queue connection; close it after each file.
afterAll(async () => {
  await closeNotificationQueue();
});
