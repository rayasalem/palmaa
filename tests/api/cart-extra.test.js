import { getRequest } from './helpers.js';

const request = getRequest();

describe('Cart extra endpoints – update/remove/clear', () => {
  it('PATCH /api/cart/items/:productId requires auth', async () => {
    const res = await request
      .patch('/api/cart/items/prod_123')
      .send({ quantity: 2 });
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/cart/items/:productId requires auth', async () => {
    const res = await request.delete('/api/cart/items/prod_123');
    expect([401, 403]).toContain(res.status);
  });

  it('DELETE /api/cart requires auth', async () => {
    const res = await request.delete('/api/cart');
    expect([401, 403]).toContain(res.status);
  });
});

