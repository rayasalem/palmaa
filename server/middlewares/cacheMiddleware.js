/**
 * Simple in-memory cache middleware for public GET endpoints.
 * - Uses node-cache with TTL (seconds) per entry.
 * - Cache key = originalUrl (path + query string).
 * - Logs safe hit/store events without payloads.
 */

import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

const cache = new NodeCache();

export function cacheMiddleware(ttlSeconds = 600) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    // لا نخزن قائمة منتجات التاجر حتى يرى التاجر المنتجات المضافة فوراً (المخزون)
    if (req.path && req.path.includes('/merchant/')) return next();

    const key = req.originalUrl || req.url || req.path;
    const cached = cache.get(key);
    if (cached) {
      logger.debug('cache hit', { path: req.path, key });
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        if (res.statusCode === 200 && body && typeof body === 'object') {
          cache.set(key, body, ttlSeconds);
          logger.debug('cache store', { path: req.path, key });
        }
      } catch (err) {
        logger.warn('cache store failed', { path: req.path, message: err && err.message });
      }
      return originalJson(body);
    };

    next();
  };
}

export default cacheMiddleware;

