/**
 * Frontend structured logger. Use for errors and warnings; no PII.
 * Optional meta can include requestId, userId when available (e.g. from API response headers or context).
 */
type LogMeta = Record<string, unknown> & { message?: string; requestId?: string; userId?: string };

function log(level: 'error' | 'warn' | 'info', tag: string, meta: LogMeta = {}): void {
  if (typeof window === 'undefined') return;
  const payload = { level, tag, ...meta, timestamp: new Date().toISOString() };
  if (level === 'error') {
    console.error(`[${tag}]`, payload);
  } else if (level === 'warn') {
    console.warn(`[${tag}]`, payload);
  } else {
    console.info(`[${tag}]`, payload);
  }
}

export const logger = {
  error(tag: string, meta: LogMeta = {}): void {
    log('error', tag, meta);
  },
  warn(tag: string, meta: LogMeta = {}): void {
    log('warn', tag, meta);
  },
  info(tag: string, meta: LogMeta = {}): void {
    log('info', tag, meta);
  },
};
