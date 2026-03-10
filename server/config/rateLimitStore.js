/**
 * Shared Redis store for express-rate-limit when REDIS_URL is set.
 * Enables consistent rate limiting across multiple Node instances behind a load balancer.
 */

import { RedisStore } from 'rate-limit-redis';
import { getRedis, isRedisConfigured } from './redisClient.js';

const PREFIX = 'palma:rl:';

let storeInstance = null;

/**
 * Get a Redis store for rate limiters, or undefined to use in-memory store.
 * When REDIS_URL is set, all limiters use this so limits are shared across instances.
 */
export function getRateLimitStore() {
  if (!isRedisConfigured()) return undefined;
  const redis = getRedis();
  if (!redis) return undefined;
  if (!storeInstance) {
    storeInstance = new RedisStore({
      sendCommand: (command, ...args) => redis.call(command, ...args),
      prefix: PREFIX,
    });
  }
  return storeInstance;
}

export default getRateLimitStore;
