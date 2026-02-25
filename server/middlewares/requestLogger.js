/**
 * Request logging middleware. Does not log body (may contain secrets).
 */

import logger, { sanitizeForLog } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || (req.socket && req.socket.remoteAddress);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    logger.info('request', {
      method,
      url,
      status,
      durationMs: duration,
      ip: ip ? String(ip).substring(0, 45) : undefined,
    });
  });
  next();
}

export default requestLogger;
