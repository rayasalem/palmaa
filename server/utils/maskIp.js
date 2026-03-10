/**
 * Mask IP for logs (privacy). Last octet for IPv4, last 4 chars for other.
 * Used by rate-limit logging and request logger.
 */

export function maskIp(ip) {
  if (!ip || typeof ip !== 'string') return 'unknown';
  const s = ip.trim();
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)) {
    const parts = s.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  if (s.length <= 4) return '*';
  return s.slice(0, -4) + '****';
}

export default maskIp;
