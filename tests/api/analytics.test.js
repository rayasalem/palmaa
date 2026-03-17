import { getRequest } from './helpers.js';

const request = getRequest();

describe('Analytics API – auth protection', () => {
  it('GET /api/analytics/admin/overview returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/analytics/admin/overview');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/analytics/merchant/overview returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/analytics/merchant/overview');
    expect([401, 403]).toContain(res.status);
  });
});

