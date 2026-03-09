/**
 * Global request timeout middleware.
 * Enforces a maximum duration for each request; responds with 503 if exceeded.
 * Does not interrupt requests that complete before the timeout.
 * Service-level timeouts (e.g. shipment, email) remain in place.
 */

import logger from '../utils/logger.js';

const DEFAULT_TIMEOUT_MS = 15000;

export function requestTimeoutMiddleware(timeoutMs = DEFAULT_TIMEOUT_MS) {
  return (req, res, next) => {
    let completed = false;

    const timer = setTimeout(() => {
      if (completed) return;
      completed = true;
      if (!res.headersSent) {
        logger.warn('requestTimeout', {
          requestId: req.id,
          url: req.originalUrl || req.url,
          method: req.method,
          timeoutMs,
        });
        res.status(503).setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Request timeout' }));
      }
    }, timeoutMs);

    const clear = () => {
      completed = true;
      clearTimeout(timer);
    };

    res.once('finish', clear);
    res.once('close', clear);

    next();
  };
}

export default requestTimeoutMiddleware;
