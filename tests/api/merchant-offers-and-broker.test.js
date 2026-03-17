import { getRequest } from './helpers.js';

const request = getRequest();

describe('Merchant offers and broker APIs – auth protection', () => {
  it('GET /api/merchant/offers requires merchant auth', async () => {
    const res = await request.get('/api/merchant/offers');
    expect([401, 403]).toContain(res.status);
  });

  it('POST /api/merchant/offers requires merchant auth', async () => {
    const res = await request.post('/api/merchant/offers').send({});
    expect([401, 403]).toContain(res.status);
  });

  it('PUT /api/merchant/offers/:id requires merchant auth', async () => {
    const res = await request.put('/api/merchant/offers/off_123').send({});
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/merchant/offers/:id requires merchant auth', async () => {
    const res = await request.delete('/api/merchant/offers/off_123');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/broker/shared-products requires broker auth', async () => {
    const res = await request.get('/api/broker/shared-products');
    expect([401, 403]).toContain(res.status);
  });

  it('PUT /api/broker/shared-products/:productId requires broker auth', async () => {
    const res = await request.put('/api/broker/shared-products/prod_123').send({});
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/broker/shared-products/:productId requires broker auth', async () => {
    const res = await request.delete('/api/broker/shared-products/prod_123');
    expect([401, 403]).toContain(res.status);
  });

  it('PATCH /api/broker/shared-products/featured/:shareId requires broker auth', async () => {
    const res = await request.patch('/api/broker/shared-products/featured/share_123');
    expect([401, 403]).toContain(res.status);
  });
});

