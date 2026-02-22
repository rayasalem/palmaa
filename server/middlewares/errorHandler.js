/**
 * Global error handler. Hides stack traces in production.
 */

import logger from '../utils/logger.js';
import { isProduction } from '../config/env.js';
import { safeErrorForUser } from '../utils/userFacingError.js';

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = safeErrorForUser(err, 'حدث خطأ، يرجى المحاولة لاحقاً') || 'Internal server error';
  const stack = err.stack;

  logger.error('errorHandler', { message, status, url: req.originalUrl, stack: isProduction() ? undefined : stack });

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
