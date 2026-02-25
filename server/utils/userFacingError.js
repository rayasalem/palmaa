/**
 * Returns a user-friendly error message, hiding technical details.
 * Technical keywords (schema cache, column, PGRST, etc.) → generic fallback.
 */

const TECHNICAL_PATTERNS = [
  /schema\s*cache/i,
  /column\s+.*\s+of\s+/i,
  /Could not find.*column/i,
  /PGRST/i,
  /relation.*does\s*not\s*exist/i,
  /permission\s*denied/i,
  /syntax\s*error/i,
  /constraint/i,
  /foreign\s*key/i,
  /null\s*violation/i,
  /supabase/i,
  /smtp/i,
  /resend/i,
  /ebadname/i,
  /getaddrinfo/i,
  /(ENOTFOUND|ECONNREFUSED|ETIMEDOUT)/i,
  /network\s*error/i,
];

export function safeErrorForUser(err, fallback = 'حدث خطأ، يرجى المحاولة لاحقاً') {
  const msg = ((err && err.message) || (err && err.error) || String(err || '')).trim();
  if (!msg) return fallback;
  const isTechnical = TECHNICAL_PATTERNS.some((re) => re.test(msg));
  return isTechnical ? fallback : msg;
}
