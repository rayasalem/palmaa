/**
 * Normalize http:// and protocol-relative URLs in API responses so HTTPS clients never get mixed content.
 * Logs each distinct upgraded URL once per process (bounded set size).
 */

import logger from './logger.js';

const MAX_LOG_KEYS = 200;
const loggedHttpUpgrades = new Set();

function logHttpUpgradeOnce(original) {
  if (!original || typeof original !== 'string' || !original.startsWith('http://')) return;
  if (loggedHttpUpgrades.size >= MAX_LOG_KEYS) return;
  const key = original.length > 500 ? `${original.slice(0, 500)}…` : original;
  if (loggedHttpUpgrades.has(key)) return;
  loggedHttpUpgrades.add(key);
  logger.warn('ensureHttpsUrl: upgraded http URL in API response (prefer HTTPS in DB)', { url: key.slice(0, 200) });
}

/**
 * @param {string|null|undefined} s
 * @returns {string|null|undefined}
 */
export function ensureHttpsUrlString(s) {
  if (s == null || typeof s !== 'string') return s;
  const t = s.trim();
  if (!t) return s;
  if (t.startsWith('//')) {
    logHttpUpgradeOnce(`//${t.slice(2)}`);
    return `https:${t}`;
  }
  if (t.startsWith('http://')) {
    logHttpUpgradeOnce(t);
    return t.replace(/^http:\/\//i, 'https://');
  }
  return s;
}

/**
 * @param {Record<string, unknown>|null|undefined} product
 */
export function sanitizeProductMedia(product) {
  if (!product || typeof product !== 'object') return product;
  const out = { ...product };
  if (typeof out.image_url === 'string' && out.image_url) {
    out.image_url = ensureHttpsUrlString(out.image_url);
  }
  if (Array.isArray(out.images)) {
    out.images = out.images.map((u) => (typeof u === 'string' ? ensureHttpsUrlString(u) : u));
  }
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} offer
 */
export function sanitizeShopOfferMedia(offer) {
  if (!offer || typeof offer !== 'object') return offer;
  const out = { ...offer };
  if (typeof out.image_url === 'string' && out.image_url) {
    out.image_url = ensureHttpsUrlString(out.image_url);
  }
  return out;
}
