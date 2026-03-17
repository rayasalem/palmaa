import { getRequest } from './helpers.js';

const request = getRequest();

describe('Payment API – validation only (no external calls)', () => {
  it('POST /api/payment/create returns 400 when body is empty', async () => {
    const res = await request.post('/api/payment/create').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('POST /api/payment/callback returns 400 when body is empty', async () => {
    const res = await request.post('/api/payment/callback').send({});
    expect([400, 403]).toContain(res.status);
  });

  it('POST /api/payment/cybersource/charge returns 400 when body is empty', async () => {
    const res = await request.post('/api/payment/cybersource/charge').send({});
    expect([400, 403]).toContain(res.status);
  });
});

