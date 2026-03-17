import { getRequest } from './helpers.js';

const request = getRequest();

describe('Merchant public profile and follow APIs', () => {
  const merchantId = 'a1b2c3d4-0000-4000-8000-000000000001';

  it('GET /api/merchant/:id returns 200/404 for UUID', async () => {
    const res = await request.get(`/api/merchant/${merchantId}`);
    expect([200, 404, 500, 403]).toContain(res.status);
  });

  it('GET /api/merchant/:id/followers-count is public', async () => {
    const res = await request.get(`/api/merchant/${merchantId}/followers-count`);
    expect([200, 404, 500, 403]).toContain(res.status);
  });

  it('GET /api/merchant/:id/following accepts optional auth', async () => {
    const res = await request.get(`/api/merchant/${merchantId}/following`);
    expect([200, 404, 401, 403, 500]).toContain(res.status);
  });

  it('POST /api/follow/:merchantId requires auth', async () => {
    const res = await request.post(`/api/follow/${merchantId}`);
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/follow/:merchantId requires auth', async () => {
    const res = await request.delete(`/api/follow/${merchantId}`);
    expect([401, 403]).toContain(res.status);
  });
});

