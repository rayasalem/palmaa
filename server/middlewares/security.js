/**
 * Helmet, rate limiting, CORS. Apply early in stack.
 * When REDIS_URL is set, rate limiters use Redis store so limits are shared across instances.
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env.js';
import { getRateLimitStore } from '../config/rateLimitStore.js';
import logger from '../utils/logger.js';
import { recordRateLimitHit } from '../utils/metrics.js';
import { maskIp } from '../utils/maskIp.js';

const isProd = getEnv('NODE_ENV') === 'production';
const WINDOW_MS = 15 * 60 * 1000;

/** Shared Redis store for all limiters when REDIS_URL is set (multi-instance support). */
function getStore() {
  const s = getRateLimitStore();
  return s ? { store: s } : {};
}

/** Build handler that logs rate-limit hit with requestId + masked IP and returns 429. */
function createRateLimitHandler(routeLabel, message = 'Too many requests') {
  return (req, res) => {
    recordRateLimitHit(routeLabel);
    logger.warn('rate_limit_429', {
      requestId: req.id,
      route: routeLabel,
      ipMasked: maskIp(req.ip || req.socket?.remoteAddress),
    });
    res.status(429).json({ success: false, error: message });
  };
}

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: isProd,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Vercel frontend to fetch API
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  });
}

export function generalLimiter() {
  const max = getEnv('RATE_LIMIT_MAX') ? Number(getEnv('RATE_LIMIT_MAX')) : 200;
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('general', 'Too many requests'),
    ...getStore(),
  });
}

export function authLimiter() {
  const max = getEnv('AUTH_RATE_LIMIT_MAX') ? Number(getEnv('AUTH_RATE_LIMIT_MAX')) : 200;
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || (req.socket && req.socket.remoteAddress) || 'unknown',
    handler: createRateLimitHandler('auth', 'Too many auth attempts. Try again in 15 minutes.'),
    ...getStore(),
  });
}

export function paymentLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('payment', 'Too many payment requests'),
    ...getStore(),
  });
}

/** Comment spam prevention: 10 comments per minute per user. */
export function commentLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('comments', 'Too many comments. Try again in a minute.'),
    ...getStore(),
  });
}

/** GET /api/products (list): env RATE_LIMIT_PRODUCTS_LIST, default 100 / 15 min. */
export function productListLimiter() {
  const max = Number(getEnv('RATE_LIMIT_PRODUCTS_LIST')) || 100;
  return rateLimit({
    windowMs: WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
    handler: createRateLimitHandler('GET /api/products'),
    ...getStore(),
  });
}

/** GET /api/products/:id (by id): env RATE_LIMIT_PRODUCTS_BY_ID, default 300 / 15 min. */
export function productByIdLimiter() {
  const max = Number(getEnv('RATE_LIMIT_PRODUCTS_BY_ID')) || 300;
  return rateLimit({
    windowMs: WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
    handler: createRateLimitHandler('GET /api/products/:id'),
    ...getStore(),
  });
}

/** Cart: 150 requests per 15 min per IP (env RATE_LIMIT_CART_MAX). */
export function cartLimiter() {
  const max = Number(getEnv('RATE_LIMIT_CART_MAX')) || 150;
  return rateLimit({
    windowMs: WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
    handler: createRateLimitHandler('cart', 'Too many cart requests'),
    ...getStore(),
  });
}

export default {
  helmetMiddleware,
  generalLimiter,
  authLimiter,
  paymentLimiter,
  commentLimiter,
  productListLimiter,
  productByIdLimiter,
  cartLimiter,
};
