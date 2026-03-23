import { devAssertNoInsecureHttpUrl } from './httpsPolicy';

/**
 * Global HTTPS enforcement & mixed-content prevention.
 * - Upgrades http:// and protocol-relative URLs for safe use on HTTPS pages.
 * - Sanitizes API JSON (nested objects/arrays) for URL-like fields.
 * - Defensive handling for null, non-strings, and unsafe schemes.
 * - Vite: uses import.meta.env.DEV for optional debug (warnings are always logged for non-convertible sources).
 */

/** Public asset from `public/` (Vite copies to dist root). */
export const IMAGE_PLACEHOLDER = '/placeholder.png';

const DEFAULT_HTTPS_FALLBACK = 'https://placehold.co/400x400?text=No+Image';

const LOG_PREFIX = '[secureUrl]';

/** Production: log each distinct http→https normalization once (fix upstream data when possible). */
const prodHttpNormalizedLogged = new Set<string>();
const MAX_PROD_HTTP_LOG = 150;

function logProdHttpNormalized(original: string): void {
  if (!import.meta.env.PROD || typeof console === 'undefined' || !console.warn) return;
  if (!original.startsWith('http://')) return;
  try {
    const host = new URL(original).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;
  } catch {
    return;
  }
  if (prodHttpNormalizedLogged.size >= MAX_PROD_HTTP_LOG) return;
  if (prodHttpNormalizedLogged.has(original)) return;
  prodHttpNormalizedLogged.add(original);
  console.warn(`${LOG_PREFIX} Normalized http→https in client (prefer HTTPS in API/DB)`, {
    url: original.length > 180 ? `${original.slice(0, 180)}…` : original,
  });
}

/** Keys whose string values are treated as remote asset URLs from APIs */
const URL_FIELD_KEYS = new Set([
  'image_url',
  'imageUrl',
  'logo_url',
  'logoUrl',
  'avatar_url',
  'avatarUrl',
  'profile_image',
  'profile_image_url',
  'thumbnail_url',
  'thumbnailUrl',
  'banner_url',
  'photo_url',
  'photo',
  'picture',
  'picture_url',
  'og_image',
  'merchant_logo',
  'store_logo',
  'icon_url',
  'favicon',
  'background_image',
  'cover_image',
  'mainImage',
  'barcodeImage',
]);

function shouldSanitizeKey(key: string): boolean {
  if (URL_FIELD_KEYS.has(key)) return true;
  if (/_url$/i.test(key) || /Url$/i.test(key)) return true;
  if (/^(image|photo|avatar|logo|thumbnail|banner|picture|icon)$/i.test(key)) return true;
  return false;
}

function isSecureDocument(): boolean {
  return typeof document !== 'undefined' && document.location?.protocol === 'https:';
}

function warnNonConvertibleUrl(source: string, reason: string): void {
  if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
  console.warn(`${LOG_PREFIX} ${reason}`, { source: source.length > 200 ? `${source.slice(0, 200)}…` : source });
}

/**
 * True if the whole string is a single absolute or protocol-relative URL (not prose containing a link).
 */
export function isWholeUrlString(s: string): boolean {
  const t = s.trim();
  if (t.length < 4) return false;
  if (t.startsWith('//')) return t.length > 2 && !/\s/.test(t);
  if (t.startsWith('http://') || t.startsWith('https://')) {
    try {
      new URL(t);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * If `url` is http://, rewrite to https://. Protocol-relative //host gets https: prefix.
 * Blocks javascript:/file: for img/API safety; warns on ftp: and other non-upgradable schemes.
 */
export function secureUrl(url: string | null | undefined): string | undefined {
  if (url == null) return undefined;
  if (typeof url !== 'string') {
    if (import.meta.env?.DEV) warnNonConvertibleUrl(String(url), 'Non-string URL value ignored');
    return undefined;
  }
  const s = url.trim();
  if (!s) return undefined;

  devAssertNoInsecureHttpUrl(s, 'secureUrl()');

  const lower = s.toLowerCase();
  if (lower.startsWith('javascript:')) {
    warnNonConvertibleUrl(s, 'Blocked URL (javascript:) — not convertible to HTTPS');
    return undefined;
  }
  if (lower.startsWith('file:')) {
    warnNonConvertibleUrl(s, 'file: URLs are not valid remote HTTPS resources');
    return undefined;
  }
  if (lower.startsWith('ftp:') || lower.startsWith('ftps:')) {
    warnNonConvertibleUrl(s, 'HTTP source not convertible to HTTPS (ftp:// cannot be upgraded for mixed content)');
    return s;
  }

  if (s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (s.startsWith('//')) {
    logProdHttpNormalized(`http:${s}`);
    return `https:${s}`;
  }

  const upgraded = s.replace(/^http:\/\//i, 'https://');
  if (s.startsWith('http://') && upgraded.startsWith('https://')) {
    logProdHttpNormalized(s);
    if (isSecureDocument() && import.meta.env?.DEV) {
      try {
        const host = new URL(upgraded).hostname;
        if (host !== 'localhost' && host !== '127.0.0.1') {
          console.debug(`${LOG_PREFIX} upgraded http→https`, { host });
        }
      } catch {
        /* ignore */
      }
    }
  }

  return upgraded;
}

/**
 * Safe image src with fallback when missing or invalid.
 */
export function secureImageSrc(url: string | null | undefined, fallback: string = DEFAULT_HTTPS_FALLBACK): string {
  const u = secureUrl(url);
  return u && u.length > 0 ? u : fallback;
}

/** Use after failed load — avoids infinite loop */
export function setImageToPlaceholder(e: { currentTarget: HTMLImageElement }): void {
  const el = e.currentTarget;
  el.onerror = null;
  el.src = IMAGE_PLACEHOLDER;
}

function sanitizeStringValue(raw: string, keyHint?: string): string {
  const needsKey = keyHint != null && shouldSanitizeKey(keyHint);
  const whole = isWholeUrlString(raw);
  if (!needsKey && !whole) return raw;
  return secureUrl(raw) ?? raw;
}

const MAX_SANITIZE_DEPTH = 48;

const IMAGE_ARRAY_KEYS = new Set(['images', 'photos', 'gallery', 'image_urls']);

/**
 * Deep-clone JSON-like API payloads and normalize URL strings (images, logos, avatars, etc.).
 * Safe for cycles via WeakSet. Idempotent with secureUrl.
 *
 * @param keyHint - parent JSON key (e.g. `images`) so array items are treated as URLs when appropriate.
 */
export function sanitizeApiResponseDeep(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
  keyHint?: string
): unknown {
  if (depth > MAX_SANITIZE_DEPTH) return value;
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return sanitizeStringValue(value, keyHint);
  }

  if (typeof value !== 'object') return value;

  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (Array.isArray(value)) {
    const treatStringsAsUrls = keyHint != null && IMAGE_ARRAY_KEYS.has(keyHint);
    return value.map((item) => {
      if (typeof item === 'string') {
        if (treatStringsAsUrls) return sanitizeStringValue(item, 'image_url');
        if (isWholeUrlString(item)) return sanitizeStringValue(item);
        return item;
      }
      return sanitizeApiResponseDeep(item, depth + 1, seen, keyHint);
    });
  }

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(obj)) {
    if (typeof child === 'string') {
      out[key] = sanitizeStringValue(child, key);
    } else {
      out[key] = sanitizeApiResponseDeep(child, depth + 1, seen, key);
    }
  }
  return out;
}

/** Normalize product image fields from API (explicit layer; also covered by sanitizeApiResponseDeep). */
export function normalizeProductImageUrls<T extends { image_url?: string; imageUrl?: string; images?: string[] }>(
  p: T
): T {
  const out = { ...p };
  if (out.image_url) out.image_url = secureUrl(out.image_url) ?? out.image_url;
  if (out.imageUrl) out.imageUrl = secureUrl(out.imageUrl) ?? out.imageUrl;
  if (Array.isArray(out.images)) {
    out.images = out.images.map((x) => secureUrl(x) ?? x);
  }
  return out;
}

/** Normalize offer banner image */
export function normalizeOfferImage<T extends { image_url?: string | null }>(o: T): T {
  if (o.image_url == null || o.image_url === '') return o;
  return { ...o, image_url: secureUrl(o.image_url) ?? o.image_url };
}
