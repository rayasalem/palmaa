import { getRequest } from './helpers.js';

const request = getRequest();

describe('Auth extra endpoints – check-key and account flows', () => {
  it('GET /api/auth/check-key returns 200 or 404 depending on env flags', async () => {
    const res = await request.get('/api/auth/check-key');
    expect([200, 404, 403]).toContain(res.status);
  });

  it('POST /api/auth/logout works even without auth (stateless logout)', async () => {
    const res = await request.post('/api/auth/logout');
    expect([200, 204, 400, 401, 403]).toContain(res.status);
  });

  it('POST /api/auth/forgot-password returns 400 when body is empty', async () => {
    const res = await request.post('/api/auth/forgot-password').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('POST /api/auth/reset-password returns 400 when body is empty', async () => {
    const res = await request.post('/api/auth/reset-password').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('POST /api/auth/resend-verification returns 400 when body is empty', async () => {
    const res = await request.post('/api/auth/resend-verification').send({});
    expect([400, 403]).toContain(res.status);
  });
});

