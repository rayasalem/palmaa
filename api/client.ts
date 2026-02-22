/**
 * api/client.ts
 * Base HTTP client for backend API. Single source for API_BASE, credentials, and JSON handling.
 * All frontend API calls should use this module or services that use it.
 */

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/** Base URL for backend; from Vite env (VITE_API_URL) or default localhost:5000 */
const API_BASE: string =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) ||
  'http://localhost:5000';

// -----------------------------------------------------------------------------
// Helpers (single-responsibility)
// -----------------------------------------------------------------------------

/**
 * Builds full URL from path. If path starts with http, returns as-is.
 * @param path - Relative path (e.g. /api/auth/login) or absolute URL
 * @returns Full URL string
 */
function buildUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
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

export { API_BASE };
