import { getRequest } from './helpers.js';

/**
 * اختبارات لمسارات /api/payments/cybersource/* (REST + hosted):
 * - POST /api/payments/cybersource/rest/process
 * - POST /api/payments/cybersource/rest/test
 * - POST /api/payments/cybersource/hosted-session
 * - POST /api/payments/cybersource/notify
 *
 * الهدف: التأكد أن هذه المسارات تستجيب ولا ترجع 404، وأن الأكواد ضمن النطاق المتوقع
 * (200/400/403/422/500/503) حسب تكوين البيئة وبيانات الدفع.
 */

const request = getRequest();

describe('Payments – CyberSource endpoints', () => {
  describe('REST process', () => {
    it('POST /api/payments/cybersource/rest/process responds with expected status code', async () => {
      const res = await request
        .post('/api/payments/cybersource/rest/process')
        .set('Content-Type', 'application/json')
        .send({}); // payload فارغ/تجريبي
      expect([200, 400, 401, 403, 422, 500, 503]).toContain(res.status);
    });

    it('non-POST methods do not return 500 (method not allowed/blocked)', async () => {
      const res = await request.get('/api/payments/cybersource/rest/process');
      expect(res.status).not.toBe(500);
    });
  });

  describe('REST test', () => {
    it('POST /api/payments/cybersource/rest/test responds with expected status code', async () => {
      const res = await request
        .post('/api/payments/cybersource/rest/test')
        .set('Content-Type', 'application/json')
        .send({});
      expect([200, 400, 401, 403, 422, 500]).toContain(res.status);
    });

    it('non-POST methods do not return 500 (method not allowed/blocked)', async () => {
      const res = await request.get('/api/payments/cybersource/rest/test');
      expect(res.status).not.toBe(500);
    });
  });

  describe('Hosted session + notify', () => {
    it('POST /api/payments/cybersource/hosted-session responds with some status', async () => {
      const res = await request
        .post('/api/payments/cybersource/hosted-session')
        .set('Content-Type', 'application/json')
        .send({});
      expect([200, 400, 401, 403, 422, 500]).toContain(res.status);
    });

    it('POST /api/payments/cybersource/notify responds (form-encoded)', async () => {
      const res = await request
        .post('/api/payments/cybersource/notify')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('dummy=1');
      expect([200, 400, 401, 403, 422, 500]).toContain(res.status);
    });
  });
});

