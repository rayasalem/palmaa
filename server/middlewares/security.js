/**
 * Helmet, rate limiting, CORS. Apply early in stack.
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env.js';

const isProd = getEnv('NODE_ENV') === 'production';

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: isProd,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Vercel frontend to fetch API
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  });
}

export function generalLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: getEnv('RATE_LIMIT_MAX') ? Number(getEnv('RATE_LIMIT_MAX')) : 200,
    message: { success: false, error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export function authLimiter() {
  const max = getEnv('AUTH_RATE_LIMIT_MAX') ? Number(getEnv('AUTH_RATE_LIMIT_MAX')) : 200;
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    message: { success: false, error: 'Too many auth attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  });
}

export function paymentLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, error: 'Too many payment requests' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/** Comment spam prevention: 10 comments per minute per user. */
export function commentLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many comments. Try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export default { helmetMiddleware, generalLimiter, authLimiter, paymentLimiter, commentLimiter };
