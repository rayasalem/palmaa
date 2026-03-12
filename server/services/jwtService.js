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
const EXPIRES_IN_ADMIN = getEnv('JWT_EXPIRES_IN_ADMIN') || '1d';
const COOKIE_NAME = getEnv('JWT_COOKIE_NAME') || 'palma_token';

/**
 * Sign a JWT. Include ver (token_version) when provided for session invalidation (logout-all).
 * High-privilege role ADMIN uses shorter expiry (JWT_EXPIRES_IN_ADMIN, default 1d) when set.
 * @param {object} payload - sub, email, role, and optionally ver (number)
 */
export function sign(payload) {
  const claims = { ...payload, iat: Math.floor(Date.now() / 1000) };
  if (payload.ver != null && typeof payload.ver === 'number') {
    claims.ver = payload.ver;
  }
  const role = (payload.role || '').toUpperCase();
  const expiresIn = role === 'ADMIN' ? EXPIRES_IN_ADMIN : EXPIRES_IN;
  return jwt.sign(claims, SECRET, { expiresIn });
}

export function verify(token) {
  try {
    return { payload: jwt.verify(token, SECRET), error: null };
  } catch (err) {
    return { payload: null, error: err };
  }
}

/** Short-lived token for MFA challenge (only used with POST /api/auth/mfa/verify). */
export function signMfaChallenge(userId) {
  return jwt.sign({ sub: userId, purpose: 'mfa_challenge', iat: Math.floor(Date.now() / 1000) }, SECRET, {
    expiresIn: '5m',
  });
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

/**
 * Options for clearCookie — MUST match getCookieOptions() for path, httpOnly, secure, sameSite
 * so the browser removes the correct cookie. Do NOT pass expires/maxAge (Express 5 ignores them; clearCookie expires immediately).
 */
export function getClearCookieOptions() {
  const opts = getCookieOptions();
  return {
    path: opts.path || '/',
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
  };
}

export default { sign, verify, getCookieName, getCookieOptions, getClearCookieOptions };
