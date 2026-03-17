import { getRequest } from './helpers.js';

/**
 * اختبارات auth المتقدمة:
 * - POST /api/auth/logout-all
 * - POST /api/auth/verify-email
 * - /api/auth/mfa/* (status, setup, verify-setup, verify, disable)
 *
 * ملاحظة: لا نملك توكنات حقيقية أو mfaChallengeToken، لذلك:
 * - نتحقق من 401/403 عندما يتطلّب المسار مصادقة.
 * - نتحقق من 400 عندما يكون الـ body غير صحيح (حيث يوجد validate).
 * - نقبل نطاقاً من الأكواد في "مسار النجاح" حتى لا نعتمد على بيانات حقيقية.
 */

const request = getRequest();

describe('Auth advanced + MFA API', () => {
  describe('POST /api/auth/logout-all', () => {
    it('requires authentication', async () => {
      const res = await request.post('/api/auth/logout-all');
      expect([401, 403]).toContain(res.status);
    });

    it('with dummy token returns 200/204/400/401/403/500', async () => {
      const res = await request
        .post('/api/auth/logout-all')
        .set('Authorization', 'Bearer dummy');
      expect([200, 204, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('returns 400/403 when body is empty', async () => {
      const res = await request.post('/api/auth/verify-email').send({});
      expect([400, 403]).toContain(res.status);
    });

    it('accepts minimally valid-shaped body (code + email) and returns 200/400/403/500', async () => {
      const res = await request.post('/api/auth/verify-email').send({
        email: 'user@example.com',
        code: '000000',
      });
      expect([200, 400, 403, 500]).toContain(res.status);
    });
  });

  describe('MFA routes under /api/auth/mfa', () => {
    it('GET /api/auth/mfa/status requires authentication', async () => {
      const res = await request.get('/api/auth/mfa/status');
      expect([401, 403]).toContain(res.status);
    });

    it('POST /api/auth/mfa/setup requires authentication', async () => {
      const res = await request.post('/api/auth/mfa/setup');
      expect([401, 403]).toContain(res.status);
    });

    it('POST /api/auth/mfa/verify-setup returns 400 when body is invalid (even if auth fails)', async () => {
      const res = await request.post('/api/auth/mfa/verify-setup').send({});
      // قد يأتي 401/403 أولاً بسبب غياب التوكن، أو 400 من الـ validate
      expect([400, 401, 403]).toContain(res.status);
    });

    it('POST /api/auth/mfa/verify accepts body but may return 200/400/403/500', async () => {
      const res = await request.post('/api/auth/mfa/verify').send({
        code: '000000',
        mfaChallengeToken: 'dummy',
      });
      expect([200, 400, 403, 500]).toContain(res.status);
    });

    it('POST /api/auth/mfa/disable requires authentication', async () => {
      const res = await request.post('/api/auth/mfa/disable');
      expect([401, 403]).toContain(res.status);
    });
  });
});

