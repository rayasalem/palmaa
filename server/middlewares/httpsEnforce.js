/**
 * In production, enforce HTTPS (when behind a proxy that sets x-forwarded-proto).
 */

import { isProduction } from '../config/env.js';

export function httpsEnforce(req, res, next) {
  if (!isProduction()) return next();
  // Some reverse proxies may not set `x-forwarded-proto` correctly.
  // Fallback to Express' `req.protocol` / `req.secure` to avoid returning 403 to clients/bots.
  const forwardedProto = req.get('x-forwarded-proto');
  const proto =
    (forwardedProto ? forwardedProto.split(',')[0].trim() : '') ||
    (req.secure ? 'https' : (req.protocol || 'http'));

  if (proto === 'https') return next();
  if (req.method === 'GET' && proto === 'http') {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }
  return res.status(403).json({ error: 'HTTPS required' });
}

export default httpsEnforce;
