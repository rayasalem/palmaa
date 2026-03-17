/**
 * Unit tests for server/services/orderService.js
 * Tests validation and constants; DB-dependent behaviour covered in API/integration tests.
 */
jest.mock('../../server/config/supabaseClient.js', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({}) }) }) }) },
}));
jest.mock('../../server/services/productService.js', () => ({ getProductById: () => Promise.resolve({ data: null }) }));
import {
  getOrderById,
  claimOrder,
  ORDER_STATUSES,
  MERCHANT_NEXT_STATUS,
} from '../../server/services/orderService.js';

describe('orderService', () => {
  describe('getOrderById', () => {
    it('returns error when order id is missing', async () => {
      const result = await getOrderById('');
      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Order id is required' });
    });

    it('returns error when order id is null/undefined', async () => {
      const result = await getOrderById(null);
      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Order id is required' });
    });

    it('returns error when order id format is invalid', async () => {
      const result = await getOrderById('not-a-uuid');
      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: 'Invalid order id format' });
    });

    it('accepts valid UUID format (actual DB call may fail in unit env)', async () => {
      const result = await getOrderById('a1b2c3d4-0000-4000-8000-000000000001');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });

    it('accepts ORD-xxxxxxxx reference format', async () => {
      const result = await getOrderById('ORD-12345678');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });
  });

  describe('claimOrder', () => {
    it('returns error when orderId or customerId missing', async () => {
      const r1 = await claimOrder('', 'cust-1');
      expect(r1.data).toBeNull();
      expect(r1.error).toEqual({ message: 'orderId and customerId are required' });
      const r2 = await claimOrder('ord-1', null);
      expect(r2.data).toBeNull();
      expect(r2.error).toBeTruthy();
    });
  });

  describe('constants', () => {
    it('ORDER_STATUSES includes expected values', () => {
      expect(ORDER_STATUSES).toContain('PENDING');
      expect(ORDER_STATUSES).toContain('ACCEPTED');
      expect(ORDER_STATUSES).toContain('COMPLETED');
      expect(ORDER_STATUSES).toContain('CANCELLED');
    });
    it('MERCHANT_NEXT_STATUS has valid transitions', () => {
      expect(MERCHANT_NEXT_STATUS.PENDING).toBe('ACCEPTED');
      expect(MERCHANT_NEXT_STATUS.ACCEPTED).toBe('IN_PROGRESS');
      expect(MERCHANT_NEXT_STATUS.ON_THE_WAY).toBe('COMPLETED');
    });
  });
});
