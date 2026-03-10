/**
 * Admin: list products, update product, delete product (with merchant_name).
 */

import { supabase } from '../../config/supabaseClient.js';
import logger from '../../utils/logger.js';
import { parsePagination } from '../../utils/pagination.js';

const PRODUCTS_TABLE = 'products';
const USERS_TABLE = 'users';

function applyPagination(query, opts) {
  const { limit, offset } = parsePagination(opts, 50, 100);
  if (limit > 0) return query.range(offset, offset + limit - 1);
  return query;
}

async function listProducts(opts = {}) {
  let query = supabase.from(PRODUCTS_TABLE).select('*').order('created_at', { ascending: false });
  query = applyPagination(query, opts);
  const { data: products, error } = await query;
  if (error) {
    logger.error('adminProductsService listProducts error', { message: error.message });
    return { data: [], error };
  }
  const list = products || [];
  const merchantIds = [...new Set(list.map((p) => p.merchant_id).filter(Boolean))];
  let merchantMap = {};
  if (merchantIds.length > 0) {
    const { data: users } = await supabase.from(USERS_TABLE).select('id, name, company_name').in('id', merchantIds);
    merchantMap = (users || []).reduce((acc, u) => {
      acc[u.id] = u.name || u.company_name || '-';
      return acc;
    }, {});
  }
  const withMerchant = list.map((p) => ({
    ...p,
    merchant_name: p.merchant_id ? merchantMap[p.merchant_id] || '-' : '-',
  }));
  return { data: withMerchant, error: null };
}

async function adminUpdateProduct(productId, payload) {
  const updates = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) {
    updates.title = payload.name;
    updates.name = payload.name;
  }
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.price !== undefined || payload.price_ils !== undefined) {
    const p = Number(payload.price_ils ?? payload.price ?? 0);
    updates.price = p;
    updates.price_ils = p;
  }
  if (payload.stock !== undefined) updates.stock = Number(payload.stock);
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.isActive !== undefined) {
    updates.status = payload.isActive ? 'active' : 'inactive';
    updates.is_active = payload.isActive;
  }
  if (payload.images) {
    updates.images = payload.images;
    updates.image_url = payload.images[0] ?? '';
  }
  const { data, error } = await supabase.from(PRODUCTS_TABLE).update(updates).eq('id', productId).select().single();
  if (error) {
    logger.error('adminProductsService adminUpdateProduct error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function adminDeleteProduct(productId) {
  const { error } = await supabase.from(PRODUCTS_TABLE).delete().eq('id', productId);
  if (error) {
    logger.error('adminProductsService adminDeleteProduct error', { message: error.message });
    return { error };
  }
  return { error: null };
}

export { listProducts, adminUpdateProduct, adminDeleteProduct };
