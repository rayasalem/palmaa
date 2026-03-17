/**
 * Unit tests for server/services/cartService.js
 * Tests validation branches that do not require DB; full flow in API/integration tests.
 */
jest.mock('../../server/config/supabaseClient.js', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({}) }) }) }) },
}));
import { addItem } from '../../server/services/cartService.js';

describe('cartService.addItem', () => {
  it('returns error when product_id is missing', async () => {
    const result = await addItem('user-1', null, 1);
    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'product_id and quantity (>= 1) required' });
  });

  it('returns error when quantity is missing', async () => {
    const result = await addItem('user-1', 'product-1', null);
    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'product_id and quantity (>= 1) required' });
  });

  it('returns error when quantity is less than 1', async () => {
    const result = await addItem('user-1', 'product-1', 0);
    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'product_id and quantity (>= 1) required' });
  });

  it('returns error when product_id is empty string', async () => {
    const result = await addItem('user-1', '', 2);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
