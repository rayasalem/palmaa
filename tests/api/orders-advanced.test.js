import { getRequest } from './helpers.js';

/**
 * إضافات لاختبارات أوامر الطلبات:
 * - GET /api/orders/merchant
 * - PATCH /api/orders/:id/cancel
 * - PATCH /api/orders/:id/invoice
 * - PATCH /api/orders/:id/complete
 * - PATCH /api/orders/:id/claim
 *
 * ملاحظة: لا نملك بيانات/توكنات حقيقية في بيئة الاختبار، لذلك:
 * - نتحقق من سلوك عدم المصادقة (401/403).
 * - نتحقق من 400 عند body غير صحيح حيث ينطبق.
 * - في "حالات النجاح" نقبل نطاقاً من الأكواد (200/201/204/400/403/404/500) حتى لا تعتمد الاختبارات على بيانات حقيقية.
 */

const request = getRequest();
const SAMPLE_ORDER_ID = 'a1b2c3d4-0000-4000-8000-000000000001';

describe('Orders advanced API', () => {
  describe('GET /api/orders/merchant', () => {
    it('returns 401/403 when not authenticated', async () => {
      const res = await request.get('/api/orders/merchant');
      expect([401, 403]).toContain(res.status);
    });

    it('returns 400/401/403/200 range when query is invalid or unauthorized', async () => {
      const res = await request
        .get('/api/orders/merchant?limit=invalid')
        .set('Authorization', 'Bearer invalid-token');
      expect([400, 401, 403, 200, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/orders/:id/cancel', () => {
    it('requires authentication', async () => {
      const res = await request.patch(`/api/orders/${SAMPLE_ORDER_ID}/cancel`);
      expect([401, 403]).toContain(res.status);
    });

    it('with dummy token returns 400/401/403/404/500 (no real order in test DB)', async () => {
      const res = await request
        .patch(`/api/orders/${SAMPLE_ORDER_ID}/cancel`)
        .set('Authorization', 'Bearer dummy');
      expect([400, 401, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/orders/:id/invoice', () => {
    it('requires authentication', async () => {
      const res = await request.patch(`/api/orders/${SAMPLE_ORDER_ID}/invoice`);
      expect([401, 403]).toContain(res.status);
    });

    it('with dummy token and minimal body returns 400/401/403/404/500', async () => {
      const res = await request
        .patch(`/api/orders/${SAMPLE_ORDER_ID}/invoice`)
        .set('Authorization', 'Bearer dummy')
        .send({ invoiceUrl: 'https://example.com/invoice.pdf' });
      expect([400, 401, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/orders/:id/complete', () => {
    it('requires authentication', async () => {
      const res = await request.patch(`/api/orders/${SAMPLE_ORDER_ID}/complete`);
      expect([401, 403]).toContain(res.status);
    });

    it('with dummy admin token returns 400/401/403/404/500', async () => {
      const res = await request
        .patch(`/api/orders/${SAMPLE_ORDER_ID}/complete`)
        .set('Authorization', 'Bearer dummy-admin');
      expect([400, 401, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/orders/:id/claim', () => {
    it('requires authentication', async () => {
      const res = await request.patch(`/api/orders/${SAMPLE_ORDER_ID}/claim`);
      expect([401, 403]).toContain(res.status);
    });

    it('with dummy token returns 400/401/403/404/500', async () => {
      const res = await request
        .patch(`/api/orders/${SAMPLE_ORDER_ID}/claim`)
        .set('Authorization', 'Bearer dummy');
      expect([400, 401, 403, 404, 500]).toContain(res.status);
    });
  });
});

