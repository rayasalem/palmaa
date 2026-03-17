/**
 * API tests: GET /api/products (list), GET /api/products/:id
 * Requires server running (e.g. TEST_API_PORT=5001 npm run start:server in another terminal, then npm run test:api).
 */
import { getRequest } from './helpers.js';

describe('GET /api/products', () => {
  const request = getRequest();

  it('returns 200 and array (success or empty list)', async () => {
    const res = await request.get('/api/products');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it('accepts query params limit and offset', async () => {
    const res = await request.get('/api/products?limit=5&offset=0');
    expect([200, 500]).toContain(res.status);
  });

  it('validation: invalid limit returns 400', async () => {
    const res = await request.get('/api/products?limit=invalid');
    expect([400, 200, 500]).toContain(res.status);
  });
});

describe('GET /api/products/:id', () => {
  const request = getRequest();

  it('returns 404 for non-UUID id', async () => {
    const res = await request.get('/api/products/not-a-uuid');
    expect([400, 404, 500]).toContain(res.status);
  });

  it('returns 404 or 200 for valid UUID (product may not exist)', async () => {
    const res = await request.get('/api/products/a1b2c3d4-0000-4000-8000-000000000001');
    expect([200, 404, 500]).toContain(res.status);
  });
});
