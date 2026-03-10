/**
 * Optional CSRF mitigation: require X-Requested-With: XMLHttpRequest for state-changing requests
 * when ENABLE_CSRF_HEADER=true and SameSite=none (cross-origin). Reduces risk of cross-site request forgery.
 * Safe to enable; frontend must send the header (e.g. fetch/axios typically do not by default — add it in api client).
 */

import { getEnv, isProduction } from '../config/env.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REQUIRED_HEADER = 'x-requested-with';
const REQUIRED_VALUE = 'xmlhttprequest';

export function csrfHeaderMiddleware(req, res, next) {
  if (getEnv('ENABLE_CSRF_HEADER', 'false') !== 'true' || !isProduction()) {
    return next();
  }
  if (!STATE_CHANGING_METHODS.has((req.method || '').toUpperCase())) {
    return next();
  }
  const value = (req.get(REQUIRED_HEADER) || '').toLowerCase();
  if (value === REQUIRED_VALUE) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Request must include X-Requested-With: XMLHttpRequest',
  });
}

export default csrfHeaderMiddleware;
