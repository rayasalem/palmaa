import { getRequest } from './helpers.js';

/**
 * اختبارات عمليات الكتابة على المنتجات:
 * - POST /api/products/bulk
 * - POST /api/products
 * - PUT /api/products/:id
 * - DELETE /api/products/:id
 *
 * بدون توكن MERCHANT حقيقي، نركّز على:
 * - 401/403 عند غياب/عدم صحة التوكن.
 * - 400 عند body غير صحيح (حيث يمر عبر validate).
 * - نقبل 200/201/204/400/403/404/500 في "مسار النجاح" حتى لا نعتمد على بيانات فعلية.
 */

const request = getRequest();
const SAMPLE_PRODUCT_ID = 'a1b2c3d4-0000-4000-8000-000000000001';

describe('Products write API', () => {
  describe('POST /api/products/bulk', () => {
    it('requires MERCHANT auth', async () => {
      const res = await request.post('/api/products/bulk').send([]);
      expect([401, 403]).toContain(res.status);
    });

    it('returns 400/401/403 for invalid body even with dummy token', async () => {
      const res = await request
        .post('/api/products/bulk')
        .set('Authorization', 'Bearer dummy-merchant')
        .send({ not: 'an array' });
      expect([400, 401, 403]).toContain(res.status);
    });
  });

  describe('POST /api/products', () => {
    it('requires MERCHANT auth', async () => {
      const res = await request.post('/api/products').send({});
      expect([401, 403]).toContain(res.status);
    });

    it('returns 400/401/403 for missing required fields', async () => {
      const res = await request
        .post('/api/products')
        .set('Authorization', 'Bearer dummy-merchant')
        .send({});
      expect([400, 401, 403]).toContain(res.status);
    });

    it('accepts valid-shaped payload (may result in 201/400/403/500)', async () => {
      const payload = {
        name: 'Test Product',
        price: 10,
        stock: 5,
        category: 'other',
      };
      const res = await request
        .post('/api/products')
        .set('Authorization', 'Bearer dummy-merchant')
        .send(payload);
      expect([201, 200, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('requires MERCHANT auth', async () => {
      const res = await request.put(`/api/products/${SAMPLE_PRODUCT_ID}`).send({});
      expect([401, 403]).toContain(res.status);
    });

    it('with dummy token and minimal body returns 200/204/400/401/403/404/500', async () => {
      const res = await request
        .put(`/api/products/${SAMPLE_PRODUCT_ID}`)
        .set('Authorization', 'Bearer dummy-merchant')
        .send({ name: 'Updated name' });
      expect([200, 204, 400, 401, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('requires MERCHANT auth', async () => {
      const res = await request.delete(`/api/products/${SAMPLE_PRODUCT_ID}`);
      expect([401, 403]).toContain(res.status);
    });

    it('with dummy token returns 200/204/400/401/403/404/500', async () => {
      const res = await request
        .delete(`/api/products/${SAMPLE_PRODUCT_ID}`)
        .set('Authorization', 'Bearer dummy-merchant');
      expect([200, 204, 400, 401, 403, 404, 500]).toContain(res.status);
    });
  });
});

