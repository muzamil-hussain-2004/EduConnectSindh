import http from 'node:http';
import { createApp } from './app';
import { prisma } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectRedis, disconnectRedis } from './config/redis';
import { closeNotificationQueue } from './jobs/queues/notification.queue';
import { startNotificationWorker } from './jobs/workers/notification.worker';
import { closeSocketServer, initSocketServer } from './sockets/socket.server';

const app = createApp();
const server = http.createServer(app);

// Socket.IO shares the same HTTP server and port as the REST API.
initSocketServer(server);
const notificationWorker = startNotificationWorker();

void connectRedis();

server.listen(env.PORT, () => {
  logger.info(`EduConnect API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown: stop accepting requests, let in-flight ones finish, then exit.
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  void closeSocketServer();
  server.close(async () => {
    // worker.close() waits for jobs that are running right now to finish.
    await notificationWorker.close();
    await closeNotificationQueue();
    await prisma.$disconnect();
    await disconnectRedis();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled rejection'));
process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught exception');
  process.exit(1);
});
