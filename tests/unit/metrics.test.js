import metricsModule, { recordRequest, getPrometheusText, recordRateLimitHit, recordValidationFailure, recordMfaFailure } from '../../server/utils/metrics.js';

describe('utils/metrics', () => {
  it('normalizes routes with UUIDs and numbers', () => {
    const raw = '/api/orders/123e4567-e89b-12d3-a456-426614174000/items/42';
    // normalizeRoute غير مصدَّرة، لكن recordRequest يستخدمها داخلياً
    const req = { originalUrl: raw, path: raw, method: 'GET', route: { path: '/api/orders/:id/items/:id' } };
    const res = { statusCode: 200 };
    recordRequest(req, res, 10);
    const text = getPrometheusText();
    expect(text).toContain('/api/orders/:id/items/:id');
  });

  it('records a request and produces Prometheus text', () => {
    const req = { originalUrl: '/api/health', path: '/api/health', method: 'GET', route: { path: '/api/health' } };
    const res = { statusCode: 200 };
    recordRequest(req, res, 15);
    const text = getPrometheusText();
    expect(typeof text).toBe('string');
    expect(text).toContain('palma_http_requests_total');
    expect(text).toContain('palma_http_request_duration_seconds');
  });

  it('records rate limit, validation, and MFA failures without throwing', () => {
    recordRateLimitHit('/api/orders');
    recordValidationFailure('orders.create');
    recordMfaFailure('mfa.verify');
    const text = getPrometheusText();
    expect(text).toContain('palma_http_rate_limit_hits_total');
    expect(text).toContain('palma_http_validation_failures_total');
    expect(text).toContain('palma_http_mfa_failures_total');
  });

  it('default export exposes the main functions', () => {
    expect(metricsModule.recordRequest).toBe(recordRequest);
    expect(metricsModule.getPrometheusText).toBe(getPrometheusText);
  });
});

