/**
 * Cache middleware for public GET endpoints.
 * - Redis-based cache when REDIS_URL is set (shared across instances). No in-memory fallback.
 * - Cache key = originalUrl (path + query string). TTL in seconds per entry.
 * - invalidateProductsCache() deletes product list keys in Redis so all instances see fresh data.
 * - API response shape unchanged.
 */

import logger from '../utils/logger.js';
import { getRedis, isRedisConfigured } from '../config/redisClient.js';

const KEY_PREFIX = 'palma:cache:';
const PRODUCT_KEYS_SET = 'palma:product-keys';

function fullKey(key) {
  return KEY_PREFIX + key;
}

function isProductListKey(key) {
  return !(key && key.indexOf('/merchant/') !== -1);
}

/**
 * Invalidate product list cache so create/update/delete return fresh data.
 * Deletes product list keys in Redis so all instances see fresh data.
 */
export async function invalidateProductsCache() {
  const redis = getRedis();
  if (!redis) return;
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
}

export function cacheMiddleware(ttlSeconds = 600) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path && req.path.includes('/merchant/')) return next();

    const key = req.originalUrl || req.url || req.path;
    const redis = isRedisConfigured() ? getRedis() : null;

    if (!redis) {
      next();
      return;
    }

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
      attachJsonInterceptor(req, res, key, ttlSeconds, redis);
      next();
    })().catch(next);
  };
}

function attachJsonInterceptor(req, res, key, ttlSeconds, redis) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      if (res.statusCode === 200 && body && typeof body === 'object' && redis) {
        const fk = fullKey(key);
        redis.set(fk, JSON.stringify(body), 'EX', ttlSeconds).then(() => {
          if (isProductListKey(key)) redis.sadd(PRODUCT_KEYS_SET, fk).catch(() => {});
          logger.debug('cache store', { requestId: req.id, path: req.path, key });
        }).catch((err) => {
          logger.warn('cache store failed', { path: req.path, message: err && err.message });
        });
      }
    } catch (err) {
      logger.warn('cache store failed', { path: req.path, message: err && err.message });
    }
    return originalJson(body);
  };
}

export default cacheMiddleware;
