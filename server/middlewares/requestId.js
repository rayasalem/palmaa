/**
 * Request ID middleware for request correlation in logs.
 * Sets req.id from X-Request-ID header or generates a new UUID.
 * Does not change any business behavior or API response.
 */

import { randomUUID } from 'crypto';

const HEADER = 'x-request-id';

export function requestIdMiddleware(req, res, next) {
  const incoming = req.get && req.get(HEADER);
  req.id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
  res.setHeader(HEADER, req.id);
  next();
}

export default requestIdMiddleware;
