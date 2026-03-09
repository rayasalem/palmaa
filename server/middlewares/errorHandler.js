/**
 * Global error handler. Hides stack traces in production.
 * Structured logs include requestId, userId, orderId, productId where applicable (no PII).
 */

import logger from '../utils/logger.js';
import { isProduction } from '../config/env.js';
import { safeErrorForUser } from '../utils/userFacingError.js';
import { getRouteIds } from './requestLogger.js';

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = safeErrorForUser(err, 'حدث خطأ، يرجى المحاولة لاحقاً') || 'Internal server error';
  const stack = err.stack;

  const meta = { requestId: req && req.id, message, status, url: req && req.originalUrl, stack: isProduction() ? undefined : stack };
  if (req && req.auth && req.auth.sub) meta.userId = req.auth.sub;
  if (req) {
    const { orderId, productId } = getRouteIds(req);
    if (orderId) meta.orderId = orderId;
    if (productId) meta.productId = productId;
  }
  logger.error('errorHandler', meta);

  const payload = {
    success: false,
    error: message,
  };
  if (!isProduction() && stack) {
    payload.stack = stack;
  }
  res.status(status).json(payload);
}

export default errorHandler;
