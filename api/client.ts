/**
 * api/client.ts
 * Base HTTP client for backend API. Single source for API_BASE, credentials, and JSON handling.
 * All frontend API calls should use this module or services that use it.
 */

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/** Production backend URL (Render). Never use an email or non-URL here. */
const PRODUCTION_API = 'https://palmaa.onrender.com';

function isHttpUrl(s: string): boolean {
  return typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://'));
}

/**
 * Resolve API base on every call (not cached).
 * When the site is loaded from palma.ps we always use PRODUCTION_API (Render URL)
 * so the site works even if api.palma.ps certificate is not yet issued.
 * Set VITE_API_URL only when your custom API domain has valid SSL.
 */
function getApiBase(): string {
  const env = (import.meta as { env?: { PROD?: boolean; VITE_API_URL?: string } }).env;
  const candidate = (env?.VITE_API_URL || '').trim();
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const h = window.location.hostname.toLowerCase();
    if (h === 'palma.ps' || h.endsWith('.palma.ps')) return PRODUCTION_API;
    if (h && h !== 'localhost' && h !== '127.0.0.1') return PRODUCTION_API;
  }
  if (isHttpUrl(candidate)) return candidate;
  return (env?.PROD ? PRODUCTION_API : '') || PRODUCTION_API;
}

/** @deprecated Use getApiBase() so URL is resolved at request time (avoids EBADNAME). */
const API_BASE = getApiBase();

/** Key for JWT in localStorage – يسمح بالجلسة على الجوال عندما لا تُرسل الكوكي (cross-origin). */
const AUTH_TOKEN_KEY = 'palma_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Headers to attach to authenticated API requests (for mobile / cross-origin when cookie is not sent). */
export function getAuthHeaders(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// -----------------------------------------------------------------------------
// Helpers (single-responsibility)
// -----------------------------------------------------------------------------

/**
 * Builds full URL from path. Resolves API base on each call to avoid EBADNAME.
 */
function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${getApiBase()}${path}`;
}

/**
 * Merges default headers (JSON, credentials) with optional custom headers.
 * Ensures Content-Type is always application/json for JSON APIs.
 */
function mergeHeaders(options: RequestInit): RequestInit {
  return {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers as Record<string, string>),
    },
  };
}

/**
 * Parses JSON response body. Returns empty object on parse failure.
 */
function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

/**
 * Extracts error message from API response body or fallback.
 * Tries error, then message, then HTTP status text.
 */
function getErrorMessage(data: unknown, status: number): string {
  const obj = data as { error?: string; message?: string };
  return obj?.error ?? obj?.message ?? `HTTP ${status}`;
}

// -----------------------------------------------------------------------------
// Main API function
// -----------------------------------------------------------------------------

/**
 * Performs authenticated JSON request to backend. Sends credentials (cookies).
 * Throws on non-2xx; caller should catch and handle.
 *
 * @param path - Relative path (e.g. /api/cart) or absolute URL
 * @param options - fetch options (method, body, headers)
 * @returns Parsed JSON as T
 * @throws Error with message from response body or status
 */
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const mergedOptions = mergeHeaders(options);
  const res = await fetch(url, mergedOptions);
  const data = await parseJson(res);

  if (!res.ok) {
    const message = getErrorMessage(data, res.status);
    throw new Error(message);
  }

  return data as T;
}

export { API_BASE, getApiBase };
