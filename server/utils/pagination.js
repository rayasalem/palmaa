/**
 * Shared pagination helper for list endpoints.
 * Sanitizes limit/offset and caps limit to avoid unbounded queries.
 * Use defaultLimit=0 when "no pagination" (return all) is desired when opts is empty.
 *
 * @param {object} opts - Optional { limit, offset }
 * @param {number} [defaultLimit=500] - Default limit when opts.limit is missing (use 0 for admin "no range" when opts empty)
 * @param {number} [maxLimit=1000] - Maximum allowed limit
 * @returns {{ limit: number, offset: number }}
 */
export function parsePagination(opts, defaultLimit = 500, maxLimit = 1000) {
  const limitVal = opts?.limit != null ? Number(opts.limit) : defaultLimit;
  const limit = Math.max(0, Math.min(Number.isNaN(limitVal) ? defaultLimit : limitVal, maxLimit));
  const offset = Math.max(0, Number(opts?.offset) || 0);
  return { limit, offset };
}
