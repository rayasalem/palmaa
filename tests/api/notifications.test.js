import { getRequest } from './helpers.js';

const request = getRequest();

describe('Notification API – auth protection', () => {
  it('GET /api/notifications returns 401/403 when not authenticated', async () => {
    const res = await request.get('/api/notifications');
    expect([401, 403]).toContain(res.status);
  });

  it('PATCH /api/notifications/:id/read returns 401/403 when not authenticated', async () => {
    const res = await request.patch('/api/notifications/notif_123/read');
    expect([401, 403]).toContain(res.status);
  });
});

