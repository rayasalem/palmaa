/**
 * Simple in-process circuit breaker for external API calls (shipment, payment, address).
 * Avoids blocking the request when the external service is slow or down.
 * Options: timeoutMs, failureThreshold, resetAfterMs.
 */

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_RESET_AFTER_MS = 30000;

import logger from './logger.js';

const state = new Map();

function getState(key) {
  if (!state.has(key)) {
    state.set(key, {
      failures: 0,
      lastFailure: 0,
      open: false,
    });
  }
  return state.get(key);
}

function openCircuit(key, resetAfterMs) {
  const s = getState(key);
  s.open = true;
  s.lastFailure = Date.now();
  logger.warn('circuit_open', { key, resetAfterMs });
  setTimeout(() => {
    s.open = false;
    s.failures = 0;
    logger.info('circuit_closed', { key });
  }, resetAfterMs);
}

/**
 * Run an async fn with timeout and circuit breaker.
 * @param {string} key - Circuit key (e.g. 'shipment', 'payment', 'address')
 * @param {() => Promise<T>} fn - Async function to run (e.g. () => axios.post(...))
 * @param {{ timeoutMs?: number, failureThreshold?: number, resetAfterMs?: number }} opts
 * @returns {Promise<{ data: T | null, error: { message: string } | null }>}
 */
export async function withCircuitBreaker(key, fn, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const failureThreshold = opts.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const resetAfterMs = opts.resetAfterMs ?? DEFAULT_RESET_AFTER_MS;
  const s = getState(key);

  if (s.open) {
    logger.warn('circuit_open_skip', { key });
    return {
      data: null,
      error: { message: `Circuit open for ${key}; try again later.` },
    };
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${key} request timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const result = await Promise.race([Promise.resolve(fn()), timeoutPromise]);
    s.failures = 0;
    return { data: result, error: null };
  } catch (err) {
    s.failures += 1;
    s.lastFailure = Date.now();
    if (s.failures >= failureThreshold) {
      openCircuit(key, resetAfterMs);
    }
    const message = err && err.message ? err.message : String(err);
    return { data: null, error: { message } };
  }
}

export default withCircuitBreaker;
