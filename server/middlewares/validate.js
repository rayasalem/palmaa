/**
 * Validation middleware. Rejects invalid input with 400 and logs with tag 'validation'.
 */

import logger from '../utils/logger.js';
import { recordValidationFailure } from '../utils/metrics.js';

/**
 * @param {import('joi').ObjectSchema} schema - Joi schema
 * @param {'body'|'query'} type - where to read input from
 * @param {string} [source] - label for metrics/logs (e.g. 'auth.login')
 */
export function validate(schema, type, source) {
  const sourceLabel = source || (type === 'body' ? 'body' : 'query');
  return (req, res, next) => {
    const value = type === 'body' ? req.body : req.query;
    const { error, value: validated } = schema.validate(value, {
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
    else req.query = validated;
    next();
  };
}

export default validate;
