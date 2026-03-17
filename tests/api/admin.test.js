import { getRequest } from './helpers.js';

const request = getRequest();

describe('Admin API – auth protection and basic validation', () => {
  it('GET /api/admin/users returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/admin/users');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/admin/orders returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/admin/orders');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/admin/products returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/admin/products');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/admin/settings returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/admin/settings');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/admin/platform-earnings returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/admin/platform-earnings');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/admin/offers returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/admin/offers');
    expect([401, 403]).toContain(res.status);
  });
});

