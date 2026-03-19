/**
 * api/client.ts
 * Base HTTP client for backend API. Single source for API_BASE, credentials, and JSON handling.
 *
 * Auth (JWT):
 * - Same-origin: httpOnly cookie only. credentials: 'include' sends the cookie; no JWT in storage.
 * - Cross-origin / mobile: Bearer token from sessionStorage (backward compat: read from localStorage if present).
 * - JWT is never written to localStorage; only sessionStorage when cross-origin so existing clients remain supported.
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
 * - If VITE_API_URL is set to a valid http/https URL → نستخدمه (مثلاً Render أو باكند محلي).
 * - غير ذلك → PRODUCTION_API (Render). للتطوير المحلي مع الباكند على Render لا تضبط شيء.
 * - لاستخدام باكند محلي: VITE_API_URL=http://localhost:5000
 */
function getApiBase(): string {
  const env = (import.meta as { env?: { VITE_API_URL?: string } }).env;
  const override = (env?.VITE_API_URL ?? '').trim();
  if (isHttpUrl(override)) return override;
  return PRODUCTION_API;
}

/** @deprecated Use getApiBase() so URL is resolved at request time (avoids EBADNAME). */
const API_BASE = getApiBase();
const hasWindow = typeof window !== 'undefined';

if (hasWindow) {
  // Runtime visibility to quickly validate the deployed frontend points to the backend API host.
  console.log('API BASE:', API_BASE);
  if (API_BASE.includes('palma.ps')) {
    console.error('❌ WRONG API BASE URL');
  }
}

/** Storage key for JWT when cross-origin. Same-origin never uses this (httpOnly cookie only). */
const AUTH_TOKEN_KEY = 'palma_token';

/**
 * True when frontend and API share the same origin so httpOnly cookie is sent automatically.
 * Cross-origin (e.g. Vercel frontend + Render API) or mobile: cookie may not be sent; use Bearer.
 */
export function isSameOrigin(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const base = getApiBase();
    const origin = window.location.origin;
    if (!base || !origin) return false;
    const apiOrigin = new URL(base).origin;
    return apiOrigin === origin;
  } catch {
    return false;
  }
}

/**
 * JWT for Bearer header. Same-origin returns null (cookie is used). Cross-origin: sessionStorage then localStorage (backward compat).
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (isSameOrigin()) return null;
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Store JWT only when cross-origin (for Bearer header). Same-origin: no-op (backend sets httpOnly cookie).
 * Never writes to localStorage; sessionStorage only so token is not persisted across tabs.
 * On clear we remove from both for backward compatibility with existing clients that may have used localStorage.
 */
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (isSameOrigin()) return;
  try {
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Same-origin: no Authorization (cookie sent via credentials: 'include'). Cross-origin/mobile: Bearer from storage. */
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
 * Sends X-Requested-With: XMLHttpRequest for CSRF mitigation when backend sets ENABLE_CSRF_HEADER=true.
 */
function mergeHeaders(options: RequestInit): RequestInit {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // X-Requested-With مطلوب فقط في نفس الأصل (same-origin). عند localhost → Render يسبب CORS preflight فنبقيه معطلاً.
  if (isSameOrigin()) {
    baseHeaders['X-Requested-With'] = 'XMLHttpRequest';
  }

  return {
    ...options,
    credentials: 'include',
    headers: {
      ...baseHeaders,
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
/** Event name for session expired (401). App listens and clears user state. */
export const SESSION_EXPIRED_EVENT = 'palma_session_expired';

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const mergedOptions = mergeHeaders(options);
  const res = await fetch(url, mergedOptions);
  const data = await parseJson(res);

  if (!res.ok) {
    if (res.status === 401) {
      setAuthToken(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    const message = getErrorMessage(data, res.status);
    throw new Error(message);
  }

  return data as T;
}

export { API_BASE, getApiBase };
