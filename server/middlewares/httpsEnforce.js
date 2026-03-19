/**
 * In production, enforce HTTPS (when behind a proxy that sets x-forwarded-proto).
 */

import { isProduction } from '../config/env.js';

export function httpsEnforce(req, res, next) {
  if (!isProduction()) return next();

  // Some hosts/proxies may omit `x-forwarded-proto` intermittently.
  // Enforce strictly only when proto is explicitly known; otherwise fail open.
  const forwardedProto = req.get('x-forwarded-proto');
  const normalizedForwarded = forwardedProto ? forwardedProto.split(',')[0].trim().toLowerCase() : '';

  if (normalizedForwarded === 'https') return next();
  if (normalizedForwarded === 'http') {
    if (req.method === 'GET') {
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    return res.status(403).json({ error: 'HTTPS required' });
  }

  // Fallbacks for setups where Express can still infer secure protocol.
  if (req.secure || req.protocol === 'https') return next();

  // Unknown protocol behind proxy: do not block requests to avoid false negatives.
  if (req.method === 'GET') {
    // Optional best-effort redirect for plain HTTP connections when host is known.
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }
  return next();
}

export default httpsEnforce;
