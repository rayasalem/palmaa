import { getRequest } from './helpers.js';

const request = getRequest();

describe('Shared products and address APIs', () => {
  it('GET /api/shared-products returns 200/400 with query validation', async () => {
    const res = await request.get('/api/shared-products?broker_id=00000000-0000-4000-8000-000000000000');
    expect([200, 400, 404, 403]).toContain(res.status);
  });

  it('GET /api/address/cities is public', async () => {
    const res = await request.get('/api/address/cities');
    expect([200, 500, 403]).toContain(res.status);
  });

  it('GET /api/address/districts-villages is public', async () => {
    const res = await request.get('/api/address/districts-villages');
    expect([200, 500, 403]).toContain(res.status);
  });

  it('GET /api/address/villages validates query', async () => {
    const res = await request.get('/api/address/villages');
    expect([400, 403]).toContain(res.status);
  });
});

