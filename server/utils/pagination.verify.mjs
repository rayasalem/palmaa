/**
 * Verification script for parsePagination (run with: node server/utils/pagination.verify.mjs).
 * Ensures shared pagination util matches behavior expected by order/product/notification/admin services.
 */
import { parsePagination } from './pagination.js';

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg);
};

// Default 500, max 1000 (order/product/notification behavior)
assert(parsePagination({}).limit === 500, 'empty opts → default limit 500');
assert(parsePagination({}).offset === 0, 'empty opts → offset 0');
assert(parsePagination({ limit: 100 }).limit === 100, 'limit 100 → 100');
assert(parsePagination({ limit: 2000 }, 500, 1000).limit === 1000, 'limit 2000 capped to 1000');
assert(parsePagination({ offset: 50 }).offset === 50, 'offset 50 → 50');
assert(parsePagination({ offset: -1 }).offset === 0, 'negative offset → 0');
assert(parsePagination({ limit: 10, offset: 20 }).limit === 10 && parsePagination({ limit: 10, offset: 20 }).offset === 20, 'both set');

// Admin behavior: defaultLimit 0 → no range when opts empty
const adminStyle = parsePagination({}, 0, 1000);
assert(adminStyle.limit === 0, 'admin empty opts → limit 0');
assert(adminStyle.offset === 0, 'admin empty opts → offset 0');
assert(parsePagination({ limit: 100 }, 0, 1000).limit === 100, 'admin with limit 100 → 100');

console.log('pagination.verify.mjs: all assertions passed.');
process.exit(0);
