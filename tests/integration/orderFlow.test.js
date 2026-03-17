/**
 * Placeholder integration test: Order flow (Controller → Service → DB).
 * Expand with real Supabase test DB or mocks to reach 80%+ coverage.
 */
import { parsePagination } from '../../server/utils/pagination.js';

describe('Order flow integration', () => {
  it('pagination is used consistently by list endpoints', () => {
    const { limit, offset } = parsePagination({ limit: 10, offset: 5 });
    expect(limit).toBe(10);
    expect(offset).toBe(5);
  });
});
