import { getRequest } from './helpers.js';

const request = getRequest();

describe('Shipment API – auth + validation', () => {
  it('POST /api/shipment/create returns 401/403 when not authenticated', async () => {
    const res = await request.post('/api/shipment/create').send({});
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/shipment/status requires auth', async () => {
    const res = await request.get('/api/shipment/status');
    expect([401, 403]).toContain(res.status);
  });

  it('POST /api/shipment/print-pdf requires auth', async () => {
    const res = await request.post('/api/shipment/print-pdf').send({});
    expect([401, 403]).toContain(res.status);
  });

  it('PUT /api/shipment/:shipmentId/cancel requires auth', async () => {
    const res = await request.put('/api/shipment/ship_123/cancel');
    expect([401, 403]).toContain(res.status);
  });
});

