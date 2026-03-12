/**
 * Validation middleware. Rejects invalid input with 400 and logs with tag 'validation'.
 */

import logger from '../utils/logger.js';
import { recordValidationFailure } from '../utils/metrics.js';

/**
 * @param {import('joi').ObjectSchema} schema - Joi schema
 * @param {'body'|'query'|'params'} type - where to read input from
 * @param {string} [source] - label for metrics/logs (e.g. 'auth.login')
 */
export function validate(schema, type, source) {
  const sourceLabel = source || type;
  return (req, res, next) => {
    if (!schema || typeof schema.validate !== 'function') {
      logger.error('validate middleware: schema missing or invalid', { source: sourceLabel });
      return res.status(500).json({ success: false, error: 'Validation schema not configured' });
    }
    const value =
      type === 'body' ? req.body : type === 'params' ? req.params : req.query;
    const raw = value ?? {};
    const { error, value: validated } = schema.validate(raw, {
      stripUnknown: true,
      abortEarly: false,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      logger.warn('validation', {
        requestId: req.id,
        source: sourceLabel,
        message,
      });
      recordValidationFailure(sourceLabel);
      return res.status(400).json({ success: false, error: message });
    }
    if (type === 'body') req.body = validated;
    else if (type === 'params') req.params = validated;
    else req.query = validated;
    next();
  };
}

export default validate;
