/**
 * JWT auth and RBAC. Attach user to req.auth (payload sub = userId, role).
 */

import { verify, getCookieName } from '../services/jwtService.js';
import logger from '../utils/logger.js';

function getTokenFromRequest(req) {
  const cookieVal = req.cookies && req.cookies[getCookieName()];
  if (cookieVal) return cookieVal;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function authenticate(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const { payload, error } = verify(token);
  if (error) {
    logger.debug('authMiddleware invalid token', { message: error.message });
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.auth = payload;
  next();
}

export function requireRole(...allowedRoles) {
  const set = new Set(allowedRoles.map((r) => String(r).toUpperCase()));
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const role = (req.auth.role || req.auth.role_id || '').toUpperCase();
    if (!set.has(role)) {
      logger.warn('requireRole denied', { userId: req.auth.sub, role, allowed: [...set] });
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

export function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (token) {
    const { payload } = verify(token);
    if (payload) req.auth = payload;
  }
  next();
}

export default { authenticate, requireRole, optionalAuth };
