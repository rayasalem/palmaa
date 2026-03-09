/**
 * Redis client for shared cache. Used by cacheMiddleware when REDIS_URL is set.
 * If REDIS_URL is missing or connection fails, cache layer falls back to in-memory (see cacheMiddleware).
 */

import Redis from 'ioredis';
import { getEnv } from './env.js';
import logger from '../utils/logger.js';

let redis = null;

function getClient() {
  if (redis) return redis;
  const url = getEnv('REDIS_URL');
  if (!url) return null;
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    redis.on('error', (err) => logger.warn('redis error', { message: err.message }));
    redis.on('connect', () => logger.debug('redis connected'));
    return redis;
  } catch (err) {
    logger.warn('redis create failed', { message: err && err.message });
    return null;
  }
}

/** Get Redis client or null. Synchronous; connection happens on first use. */
export function getRedis() {
  return getClient();
}

export function isRedisConfigured() {
  return !!getEnv('REDIS_URL');
}
