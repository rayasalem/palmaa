/**
 * JWT auth and RBAC. Attach user to req.auth (payload sub = userId, role).
 * When JWT contains ver claim, it is checked against DB token_version (logout-all invalidation).
 */

import { verify, getCookieName } from '../services/jwtService.js';
import { getTokenVersion } from '../services/authService.js';
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
  if (payload.ver != null && payload.sub) {
    return getTokenVersion(payload.sub)
      .then((dbVer) => {
        if (Number(payload.ver) < Number(dbVer)) {
          logger.info('authMiddleware token revoked (logout-all)', { userId: payload.sub });
          return res.status(401).json({ success: false, error: 'Session invalidated. Please log in again.' });
        }
        next();
      })
      .catch((err) => {
        logger.error('authMiddleware getTokenVersion', { message: err && err.message });
        next();
      });
  }
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
