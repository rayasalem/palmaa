/**
 * Basic input sanitization to reduce XSS and injection risk.
 * Supabase uses parameterized queries; this helps for logging and display.
 */

const XSS_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const DANGEROUS_CHARS = /[<>\"'`;]/g;

export function sanitizeString(str, maxLength = 1000) {
  if (str == null) return '';
  const s = String(str).trim();
  const truncated = s.length > maxLength ? s.slice(0, maxLength) : s;
  return truncated.replace(XSS_REGEX, '').replace(DANGEROUS_CHARS, '');
}

export function sanitizeObject(obj, keysToSanitize = [], maxLength = 500) {
  if (obj == null || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  const keys = keysToSanitize.length > 0 ? keysToSanitize : Object.keys(out);
  for (const key of keys) {
    if (out[key] != null && typeof out[key] === 'string') {
      out[key] = sanitizeString(out[key], maxLength);
    }
  }
  return out;
}

export default { sanitizeString, sanitizeObject };
