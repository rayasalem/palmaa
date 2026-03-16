/**
 * Cache middleware for public GET endpoints.
 * - Redis-based cache when REDIS_URL is set (shared across instances).
 * - Optional in-memory fallback when Redis is not set (single-instance staging only).
 * - Cache key = originalUrl (path + query string). TTL in seconds per entry.
 * - invalidateProductsCache() clears Redis or in-memory product list keys.
 */

import logger from '../utils/logger.js';
import { getRedis, isRedisConfigured } from '../config/redisClient.js';

const KEY_PREFIX = 'palma:cache:';
const PRODUCT_KEYS_SET = 'palma:product-keys';

/** In-memory cache for single-instance when Redis is not configured. Key -> { body, expires }. Kept small to avoid exceeding memory on Render. */
const memoryCache = new Map();
const memoryProductKeys = new Set();
const MEMORY_CACHE_MAX_ENTRIES = parseInt(process.env.MEMORY_CACHE_MAX_ENTRIES || '200', 10) || 200;
/** Skip storing response body in memory if larger than this (bytes) to avoid memory spikes. */
const MEMORY_CACHE_MAX_BODY_BYTES = parseInt(process.env.MEMORY_CACHE_MAX_BODY_BYTES || '524288', 10) || 524288; // 512KB

function fullKey(key) {
  return KEY_PREFIX + key;
}

function isProductListKey(key) {
  return !(key && key.indexOf('/merchant/') !== -1);
}

/**
 * Invalidate product list cache so create/update/delete return fresh data.
 * Uses Redis when configured; otherwise clears in-memory product list keys.
 */
export async function invalidateProductsCache() {
  const redis = getRedis();
  if (redis) {
    try {
      const keys = await redis.smembers(PRODUCT_KEYS_SET);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
        await redis.del(PRODUCT_KEYS_SET);
        logger.debug('cache invalidated (Redis)', { count: keys.length });
      }
    } catch (err) {
      logger.warn('cache invalidate failed', { message: err && err.message });
    }
    return;
  }
  const count = memoryProductKeys.size;
  for (const fk of memoryProductKeys) {
    memoryCache.delete(fk);
  }
  memoryProductKeys.clear();
  if (count > 0) logger.debug('cache invalidated (memory)', { count });
}

export function cacheMiddleware(ttlSeconds = 600) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path && req.path.includes('/merchant/')) return next();

    const key = req.originalUrl || req.url || req.path;
    const redis = isRedisConfigured() ? getRedis() : null;

    if (redis) {
      (async () => {
        try {
          const fk = fullKey(key);
          const raw = await redis.get(fk);
          if (raw) {
            logger.debug('cache hit', { requestId: req.id, path: req.path, key });
            return res.json(JSON.parse(raw));
          }
        } catch (err) {
          logger.warn('cache get failed', { path: req.path, message: err && err.message });
        }
        attachJsonInterceptor(req, res, key, ttlSeconds, redis, null);
        next();
      })().catch(next);
      return;
    }

    // In-memory fallback (single-instance staging)
    const fk = fullKey(key);
    const entry = memoryCache.get(fk);
    const now = Date.now();
    if (entry && entry.expires > now) {
      logger.debug('cache hit (memory)', { requestId: req.id, path: req.path, key });
      return res.json(entry.body);
    }
    if (entry) memoryCache.delete(fk);
    attachJsonInterceptor(req, res, key, ttlSeconds, null, fk);
    next();
  };
}

function attachJsonInterceptor(req, res, key, ttlSeconds, redis, memoryKey) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      if (res.statusCode === 200 && body && typeof body === 'object') {
        if (redis) {
          const fk = fullKey(key);
          redis
            .set(fk, JSON.stringify(body), 'EX', ttlSeconds)
            .then(() => {
              if (isProductListKey(key)) redis.sadd(PRODUCT_KEYS_SET, fk).catch(() => {});
              logger.debug('cache store', { requestId: req.id, path: req.path, key });
            })
            .catch((err) => {
              logger.warn('cache store failed', { path: req.path, message: err && err.message });
            });
        } else if (memoryKey) {
          const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
          if (bodyStr.length > MEMORY_CACHE_MAX_BODY_BYTES) {
            logger.debug('cache skip (body too large)', { requestId: req.id, path: req.path, bytes: bodyStr.length });
          } else {
            if (memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
              const oldestKey = memoryCache.keys().next().value;
              if (oldestKey) {
                memoryCache.delete(oldestKey);
                memoryProductKeys.delete(oldestKey);
                logger.debug('cache evict (memory)', { evictedKey: oldestKey });
              }
            }
            memoryCache.set(memoryKey, {
              body,
              expires: Date.now() + ttlSeconds * 1000,
            });
            if (isProductListKey(key)) memoryProductKeys.add(memoryKey);
            logger.debug('cache store (memory)', { requestId: req.id, path: req.path, key, size: memoryCache.size });
          }
        }
      }
    } catch (err) {
      logger.warn('cache store failed', { path: req.path, message: err && err.message });
    }
    return originalJson(body);
  };
}

export default cacheMiddleware;
