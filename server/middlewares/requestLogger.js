/**
 * Request logging middleware. Does not log body (may contain secrets).
 * Structured logs include requestId, userId, orderId, productId; IP is masked for privacy.
 */

import logger from '../utils/logger.js';
import { maskIp } from '../utils/maskIp.js';

/** Extract orderId/productId from route params for structured logs. IDs only, no PII. */
export function getRouteIds(req) {
  const params = req.params || {};
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const orderId = path.includes('/orders/') && params.id ? params.id : undefined;
  const productId = path.includes('/products/') && params.id ? params.id : undefined;
  return { orderId, productId };
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ipRaw = req.ip || (req.socket && req.socket.remoteAddress);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const { orderId, productId } = getRouteIds(req);
    const meta = {
      requestId: req.id,
      method,
      url,
      status,
      durationMs: duration,
      ipMasked: maskIp(ipRaw),
    };
    if (req.auth && req.auth.sub) meta.userId = req.auth.sub;
    if (orderId) meta.orderId = orderId;
    if (productId) meta.productId = productId;
    logger.info('request', meta);
  });
  next();
}

export default requestLogger;
