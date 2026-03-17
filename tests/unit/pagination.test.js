/**
 * Unit tests for server/utils/pagination.js
 */
import { parsePagination } from '../../server/utils/pagination.js';

describe('parsePagination', () => {
  it('returns default limit and offset when opts is empty', () => {
    const result = parsePagination({});
    expect(result).toEqual({ limit: 500, offset: 0 });
  });

  it('returns default limit and offset when opts is undefined', () => {
    const result = parsePagination(undefined);
    expect(result).toEqual({ limit: 500, offset: 0 });
  });

  it('uses custom defaultLimit when provided and opts empty', () => {
    const result = parsePagination({}, 100, 1000);
    expect(result).toEqual({ limit: 100, offset: 0 });
  });

  it('uses defaultLimit=0 when no limit in opts', () => {
    const result = parsePagination({}, 0, 1000);
    expect(result).toEqual({ limit: 0, offset: 0 });
  });

  it('respects opts.limit and opts.offset', () => {
    const result = parsePagination({ limit: 10, offset: 20 });
    expect(result).toEqual({ limit: 10, offset: 20 });
  });

  it('caps limit to maxLimit', () => {
    const result = parsePagination({ limit: 5000 }, 500, 1000);
    expect(result).toEqual({ limit: 1000, offset: 0 });
  });

  it('clamps limit to 0 when negative', () => {
    const result = parsePagination({ limit: -5 }, 500, 1000);
    expect(result).toEqual({ limit: 0, offset: 0 });
  });

  it('clamps offset to 0 when negative', () => {
    const result = parsePagination({ offset: -10 });
    expect(result).toEqual({ limit: 500, offset: 0 });
  });

  it('uses default limit when opts.limit is NaN', () => {
    const result = parsePagination({ limit: 'invalid' }, 500, 1000);
    expect(result).toEqual({ limit: 500, offset: 0 });
  });

  it('parses string numbers for limit and offset', () => {
    const result = parsePagination({ limit: '25', offset: '50' });
    expect(result).toEqual({ limit: 25, offset: 50 });
  });
});
