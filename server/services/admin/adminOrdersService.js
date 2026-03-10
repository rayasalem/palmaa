/**
 * Admin: list all orders with pagination.
 */

import { supabase } from '../../config/supabaseClient.js';
import logger from '../../utils/logger.js';
import { parsePagination } from '../../utils/pagination.js';

const ORDERS_TABLE = 'orders';

function applyPagination(query, opts) {
  const { limit, offset } = parsePagination(opts, 50, 100);
  if (limit > 0) return query.range(offset, offset + limit - 1);
  return query;
}

async function listOrders(opts = {}) {
  let query = supabase.from(ORDERS_TABLE).select('*, order_items(*)').order('created_at', { ascending: false });
  query = applyPagination(query, opts);
  const { data, error } = await query;
  if (error) {
    logger.error('adminOrdersService listOrders error', { message: error.message });
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

export { listOrders };
