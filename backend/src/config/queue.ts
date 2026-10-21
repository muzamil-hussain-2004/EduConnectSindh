import Redis from 'ioredis';
import { env } from './env';

// BullMQ needs its own connections, separate from the cache client in redis.ts:
// - workers use blocking commands, so they require maxRetriesPerRequest: null
// - producers (the API) must fail fast when Redis is down instead of hanging the request
export const BULL_PREFIX = env.NODE_ENV === 'test' ? 'bull-test' : 'bull';

export const createProducerConnection = () =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
  }).on('error', () => undefined);

export const createWorkerConnection = () =>
  new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }).on('error', () => undefined);
