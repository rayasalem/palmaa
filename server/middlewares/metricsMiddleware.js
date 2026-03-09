/**
 * Records request metrics for Prometheus. Does not change request/response.
 */

import { recordRequest } from '../utils/metrics.js';

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    try {
      recordRequest(req, res, Date.now() - start);
    } catch (_) {
      /* ignore */
    }
  });
  next();
}

export default metricsMiddleware;
