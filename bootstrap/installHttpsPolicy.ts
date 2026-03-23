/**
 * Side-effect module: patches global fetch + XMLHttpRequest before any other app code runs.
 * Imported first from index.tsx.
 */

import { enforceFetchUrlPolicy, HttpsPolicyError } from '../utils/httpsPolicy';

function extractUrlString(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return null;
}

function patchFetch(): void {
  if (typeof globalThis.fetch !== 'function') return;
  const native = globalThis.fetch.bind(globalThis);

  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const raw = extractUrlString(input);
    if (raw === null) {
      return native(input as RequestInfo, init);
    }
    try {
      const next = enforceFetchUrlPolicy(raw);
      if (typeof input === 'string') {
        return next === input ? native(input, init) : native(next, init);
      }
      if (input instanceof URL) {
        return next === input.href ? native(input, init) : native(new URL(next), init);
      }
      if (typeof Request !== 'undefined' && input instanceof Request) {
        return next === input.url ? native(input, init) : native(new Request(next, input), init);
      }
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new HttpsPolicyError(String(e)));
    }
    return native(input as RequestInfo, init);
  };
}

function patchXHR(): void {
  if (typeof XMLHttpRequest === 'undefined') return;
  const origOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ): void {
    const urlStr = typeof url === 'string' ? url : url.href;
    const next = enforceFetchUrlPolicy(urlStr);
    return (origOpen as (...args: unknown[]) => void).apply(this, [method, next, ...rest]);
  };
}

patchFetch();
patchXHR();
