/**
 * JWT issue and verify. Use for API auth after login.
 * Token stored in httpOnly cookie or sent in Authorization header.
 */

import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';

const rawSecret = getEnv('JWT_SECRET') || getEnv('JWT_SECRET_KEY');
const DEFAULT_DEV = 'dev-fallback-secret-change-in-production-64chars-minimum-required';
const SECRET = rawSecret || DEFAULT_DEV;

// في الإنتاج: عدم التشغيل بمفتاح افتراضي أو مفقود (أمان)
if (getEnv('NODE_ENV') === 'production') {
  if (!rawSecret || SECRET === DEFAULT_DEV) {
    throw new Error(
      'JWT_SECRET is required in production. Set JWT_SECRET in server/.env or in your hosting environment (e.g. Render).'
    );
  }
  if (SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}
const EXPIRES_IN = getEnv('JWT_EXPIRES_IN') || '7d';
const COOKIE_NAME = getEnv('JWT_COOKIE_NAME') || 'palma_token';

export function sign(payload) {
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function verify(token) {
  try {
    return { payload: jwt.verify(token, SECRET), error: null };
  } catch (err) {
    return { payload: null, error: err };
  }
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function getCookieOptions() {
  const isProd = getEnv('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    // none so cookie is sent when frontend (Vercel) and API (Render) are on different domains
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

export default { sign, verify, getCookieName, getCookieOptions };
