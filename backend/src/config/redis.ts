import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

// Fail fast instead of queueing commands while Redis is down: the cache is an optimisation,
// so a Redis outage must never make the API slow or broken.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
  lazyConnect: true,
});

let lastErrorLog = 0;
redis.on('error', (err) => {
  // ioredis emits an error on every failed reconnect; log at most once a minute.
  if (Date.now() - lastErrorLog > 60_000) {
    lastErrorLog = Date.now();
    logger.warn({ err: err.message }, 'Redis unavailable, continuing without cache');
  }
});

export async function connectRedis() {
  if (redis.status === 'wait') await redis.connect().catch(() => undefined);
}

export async function disconnectRedis() {
  if (redis.status !== 'end') await redis.quit().catch(() => redis.disconnect());
}
