/**
 * Sanitizes error messages in JSON responses so technical details
 * (schema cache, column, PGRST, etc.) are not shown to users.
 */

import { safeErrorForUser } from '../utils/userFacingError.js';

const FALLBACK = 'حدث خطأ، يرجى المحاولة لاحقاً';

export function sanitizeErrorResponse(req, res, next) {
  const _json = res.json.bind(res);
  res.json = function (body) {
    if (body && typeof body === 'object' && body.success === false && body.error && res.statusCode >= 400) {
      body = { ...body, error: safeErrorForUser({ message: body.error }, FALLBACK) };
    }
    return _json(body);
  };
  next();
}

export default sanitizeErrorResponse;
