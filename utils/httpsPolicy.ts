/**
 * Enterprise HTTPS-only policy for the browser bundle.
 * - Blocks fetch/XMLHttpRequest to insecure http:// URLs when the app is served over HTTPS (or cross-origin http).
 * - In development: fails loudly (console.error + thrown HttpsPolicyError).
 * - Optional: VITE_HTTP_LEGACY_PROXY rewrites legacy http:// URLs through an HTTPS proxy you control.
 *
 * @see bootstrap/installHttpsPolicy.ts (must run before other app code)
 */

export class HttpsPolicyError extends Error {
  override name = 'HttpsPolicyError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, HttpsPolicyError.prototype);
  }
}

const LOG = '[HTTPS Policy]';

/** Allow http://localhost / 127.0.0.1 for local API (dev only unless explicitly enabled). */
export function isLocalhostHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

function allowHttpToLocalhost(): boolean {
  return import.meta.env.VITE_ALLOW_HTTP_LOCALHOST !== 'false';
}

function legacyProxyBase(): string | undefined {
  const p = (import.meta.env.VITE_HTTP_LEGACY_PROXY as string | undefined)?.trim();
  return p || undefined;
}

/**
 * True when the active page is served over HTTPS (strict mixed-content context).
 */
export function isPageHttps(): boolean {
  return typeof window !== 'undefined' && window.location?.protocol === 'https:';
}

/**
 * Resolve relative URL strings against the current origin (for policy checks).
 */
function toAbsoluteHref(urlLike: string): string {
  const s = urlLike.trim();
  if (!s) return s;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('//')) {
    return s.startsWith('//') ? `https:${s}` : s;
  }
  if (typeof window === 'undefined') return s;
  try {
    return new URL(s, window.location.href).href;
  } catch {
    return s;
  }
}

/**
 * Enforces HTTPS-only rules for outgoing network requests (fetch / XHR).
 * Returns the URL string to use (may be rewritten to legacy HTTPS proxy).
 * @throws HttpsPolicyError when an http:// request must not proceed.
 */
export function enforceFetchUrlPolicy(urlLike: string): string {
  const s0 = urlLike.trim();
  if (!s0) return urlLike;
  if (s0.startsWith('blob:') || s0.startsWith('data:') || s0.startsWith('about:')) return s0;

  const absolute = toAbsoluteHref(urlLike);

  let u: URL;
  try {
    u = new URL(absolute);
  } catch {
    return urlLike;
  }

  if (u.protocol === 'https:') return u.toString();
  if (u.protocol === 'blob:' || u.protocol === 'data:') return u.toString();

  if (u.protocol !== 'http:') {
    if (import.meta.env.DEV && /^(ftp|file):/i.test(u.protocol)) {
      console.warn(`${LOG} Non-HTTPS scheme in request (not upgraded)`, { scheme: u.protocol, url: u.toString() });
    }
    return u.toString();
  }

  // --- http: ---
  const proxy = legacyProxyBase();
  if (proxy) {
    const target = encodeURIComponent(u.toString());
    const sep = proxy.includes('?') ? '&' : '?';
    return `${proxy}${sep}url=${target}`;
  }

  if (typeof window !== 'undefined') {
    const page = window.location;

    // Same-origin HTTP page (typical Vite dev): allow same-origin http API calls
    if (page.protocol === 'http:' && u.origin === page.origin) {
      return u.toString();
    }

    // Localhost API from dev / tooling
    if (isLocalhostHostname(u.hostname) && allowHttpToLocalhost()) {
      if (import.meta.env.DEV && isPageHttps()) {
        console.warn(
          `${LOG} Allowing http:// to localhost while page is HTTPS — use HTTPS for the API or a tunnel in production.`,
          { url: u.toString() }
        );
      }
      return u.toString();
    }
  }

  const msg = `${LOG} Blocked insecure HTTP request (use HTTPS, same-origin relative URLs, or set VITE_HTTP_LEGACY_PROXY): ${u.toString()}`;
  const err = new HttpsPolicyError(msg);

  if (import.meta.env.DEV) {
    console.error(msg, err);
  } else {
    console.error(msg);
  }

  throw err;
}

const devWarnedInsecureUrls = new Set<string>();

/**
 * Dev-only: surface legacy http:// sources once per distinct URL (before secureUrl upgrade).
 */
export function devAssertNoInsecureHttpUrl(url: string | null | undefined, context: string): void {
  if (!import.meta.env.DEV || url == null || typeof url !== 'string') return;
  const t = url.trim();
  if (!t.startsWith('http://')) return;
  try {
    const u = new URL(t);
    if (isLocalhostHostname(u.hostname)) return;
  } catch {
    return;
  }
  if (devWarnedInsecureUrls.has(t)) return;
  devWarnedInsecureUrls.add(t);
  console.error(`${LOG} Insecure HTTP source detected (${context})`, {
    url: t,
    hint: 'Normalized to HTTPS via secureUrl() / sanitizeApiResponseDeep — fix upstream data when possible.',
  });
}
