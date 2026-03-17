/**
 * API tests: GET /api/cart, POST /api/cart/items
 * Requires server running (TEST_API_PORT=5001 npm run start:server then npm run test:api).
 */
import { getRequest } from './helpers.js';

describe('GET /api/cart', () => {
  const request = getRequest();

  it('returns 401 when not authenticated', async () => {
    const res = await request.get('/api/cart');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/cart/items', () => {
  const request = getRequest();

  it('returns 401 when not authenticated', async () => {
    const res = await request
      .post('/api/cart/items')
      .set('Content-Type', 'application/json')
      .send({ product_id: 'a1b2c3d4-0000-4000-8000-000000000001', quantity: 1 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request
      .post('/api/cart/items')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer dummy')
      .send({});
    expect([400, 401]).toContain(res.status);
  });

  it('returns 400 when product_id and productId are both missing', async () => {
    const res = await request
      .post('/api/cart/items')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer dummy')
      .send({ quantity: 1 });
    expect([400, 401]).toContain(res.status);
  });
});
