import { createHash } from 'node:crypto';
import { connectRedis, redis } from '../../config/redis';
import { logger } from '../../config/logger';

const VERSION_KEY = 'cache:tutor-search:version';

// Same query in a different key order must hit the same cache entry.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Cache-aside with version-based invalidation.
 * Every key embeds a version number; bumping it makes all old entries unreachable
 * (they expire on their own via TTL), which avoids scanning/deleting keys.
 * If Redis fails at any point we silently fall back to the loader.
 */
export const searchCache = {
  async getOrLoad<T>(query: unknown, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    let key: string | undefined;
    try {
      await connectRedis();
      const version = (await redis.get(VERSION_KEY)) ?? '0';
      const hash = createHash('sha1').update(stableStringify(query)).digest('hex');
      key = `cache:tutor-search:v${version}:${hash}`;

      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit) as T;
    } catch (err) {
      logger.debug({ err }, 'Cache read failed');
      key = undefined;
    }

    const fresh = await load();

    if (key) {
      redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds).catch((err: unknown) => {
        logger.debug({ err }, 'Cache write failed');
      });
    }
    return fresh;
  },

  // Call whenever something that appears in search results changes.
  async invalidate() {
    try {
      await connectRedis();
      await redis.incr(VERSION_KEY);
    } catch (err) {
      logger.debug({ err }, 'Cache invalidation failed');
    }
  },
};
