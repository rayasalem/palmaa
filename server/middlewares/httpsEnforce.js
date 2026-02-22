/**
 * In production, enforce HTTPS (when behind a proxy that sets x-forwarded-proto).
 */

import { isProduction } from '../config/env.js';

export function httpsEnforce(req, res, next) {
  if (!isProduction()) return next();
  const proto = req.get('x-forwarded-proto');
  if (proto === 'https') return next();
  if (req.method === 'GET' && proto === 'http') {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }
  return res.status(403).json({ error: 'HTTPS required' });
}

export default httpsEnforce;
