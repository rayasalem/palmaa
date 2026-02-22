/**
 * Winston logger. Do not log passwords, tokens, or card data.
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'palma-server' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(timestamp(), logFormat)
        : combine(colorize(), timestamp(), logFormat),
    }),
  ],
});

export function sanitizeForLog(obj) {
  if (obj == null) return obj;
  const forbidden = ['password', 'token', 'secret', 'authorization', 'cookie', 'otp', 'code', 'card'];
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  function redact(o) {
    if (o == null || typeof o !== 'object') return;
    for (const key of Object.keys(o)) {
      const lower = key.toLowerCase();
      if (forbidden.some((f) => lower.includes(f))) {
        o[key] = '[REDACTED]';
      } else if (typeof o[key] === 'object' && o[key] !== null) {
        redact(o[key]);
      }
    }
  }
  redact(out);
  return out;
}

export default logger;
