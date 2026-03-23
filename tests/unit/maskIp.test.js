import { maskIp } from '../../server/utils/maskIp.js';

describe('utils/maskIp', () => {
  it('returns "unknown" for falsy/non-string values', () => {
    expect(maskIp(null)).toBe('unknown');
    // @ts-expect-error
    expect(maskIp(undefined)).toBe('unknown');
    // @ts-expect-error
    expect(maskIp(123)).toBe('unknown');
  });

  it('masks IPv4 by hiding last octet', () => {
    expect(maskIp('192.168.1.10')).toBe('192.168.1.*');
    expect(maskIp(' 10.0.0.5 ')).toBe('10.0.0.*');
  });

  it('masks short non-IPv4 strings as "*"', () => {
    expect(maskIp('abc')).toBe('*');
  });

  it('masks other strings by keeping all but last 4 chars', () => {
    expect(maskIp('abcdef01')).toBe('abcd****');
    expect(maskIp('long-ip-like-string')).toBe('long-ip-like-st****');
  });
});

