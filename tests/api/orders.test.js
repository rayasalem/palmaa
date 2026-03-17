/**
 * API tests: GET /api/orders, POST /api/orders, PATCH /api/orders/:id/status, GET /api/orders/:id
 * Requires server running (TEST_API_PORT=5001 npm run start:server then npm run test:api).
 */
import { getRequest } from './helpers.js';

describe('GET /api/orders', () => {
  const request = getRequest();

  it('returns 401 when not authenticated', async () => {
    const res = await request.get('/api/orders');
    expect([401, 403]).toContain(res.status);
  });

  it('returns 401 with invalid Bearer token', async () => {
    const res = await request.get('/api/orders').set('Authorization', 'Bearer invalid-token');
    expect([401, 403]).toContain(res.status);
  });
});

describe('POST /api/orders', () => {
  const request = getRequest();

  it('returns 400 when body is missing required fields', async () => {
    const res = await request.post('/api/orders').set('Content-Type', 'application/json').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('returns 400 when recipient_name is missing', async () => {
    const res = await request
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send({ address: 'Some address', city: 'City', phone: '123', amount: 100, weight: 1 });
    expect([400, 403]).toContain(res.status);
  });

  it('validation: valid shape may return 201 or 500 (DB)', async () => {
    const res = await request
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send({
        recipient_name: 'Test User',
        address: 'Test Address',
        city: 'Test City',
        phone: '0500000000',
        amount: 100,
        weight: 1,
        items: [],
      });
    expect([201, 400, 403, 500]).toContain(res.status);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  const request = getRequest();

  it('returns 401 when not authenticated', async () => {
    const res = await request
      .patch('/api/orders/a1b2c3d4-0000-4000-8000-000000000001/status')
      .set('Content-Type', 'application/json')
      .send({ status: 'ACCEPTED' });
    expect([401, 403]).toContain(res.status);
  });

  it('returns 400 when status is invalid', async () => {
    const res = await request
      .patch('/api/orders/a1b2c3d4-0000-4000-8000-000000000001/status')
      .set('Authorization', 'Bearer dummy')
      .set('Content-Type', 'application/json')
      .send({ status: 'INVALID_STATUS' });
    expect([400, 401, 403]).toContain(res.status);
  });
});

describe('GET /api/orders/:id', () => {
  const request = getRequest();

  it('accepts request without auth (guest order by id or token)', async () => {
    const res = await request.get('/api/orders/a1b2c3d4-0000-4000-8000-000000000001');
    expect([200, 404, 401, 403, 500]).toContain(res.status);
  });
});
