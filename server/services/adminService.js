/**
 * Admin service: list users, update user status, list orders, products, platform earnings (Supabase).
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

const USERS_TABLE = 'users';
const ORDERS_TABLE = 'orders';
const PRODUCTS_TABLE = 'products';
const TRANSACTIONS_TABLE = 'transactions';

function applyPagination(query, opts) {
  const { limit, offset } = parsePagination(opts, 0, 1000);
  if (limit > 0) {
    return query.range(offset, offset + limit - 1);
  }
  return query;
}

async function listUsers(opts = {}) {
  let query = supabase
    .from(USERS_TABLE)
    .select('id, email, name, role, status, phone, created_at, updated_at, terms_accepted, terms_accepted_at, email_verified')
    .order('created_at', { ascending: false });
  query = applyPagination(query, opts);
  const { data, error } = await query;
  if (error) {
    logger.error('adminService listUsers error', { message: error.message });
    return { data: [], error };
  }
  const list = (data || []).map((u) => ({
    ...u,
    is_email_verified: u.email_verified ?? false,
    deleted_at: u.deleted_at ?? null,
    deleted_reason: u.deleted_reason ?? null,
  }));
  return { data: list, error: null };
}

async function updateUserStatus(userId, status) {
  const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
  const s = String(status).toUpperCase();
  if (!allowed.includes(s)) {
    return { data: null, error: { message: 'Invalid status' } };
  }
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      status: s,
      is_approved: s === 'APPROVED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    logger.error('adminService updateUserStatus error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Soft delete user:
 * - Sets status = 'DELETED' and updated_at (يعتمد على أعمدة أساسية فقط لتفادي خطأ أعمدة غير موجودة)
 * - تسجيل الدخول يُرفض لاحقاً عند status === 'DELETED'
 */
async function softDeleteUser(userId, reason) {
  const now = new Date().toISOString();
  const payload = { status: 'DELETED', updated_at: now };
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update(payload)
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    logger.error('adminService softDeleteUser error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Restore user within 30 days of deletion.
 * - Clears deleted_at / deleted_reason
 * - يعيد الحالة إلى PENDING حتى يقرر الأدمن الموافقة لاحقاً
 */
async function restoreUser(userId) {
  const { data: userRow, error: findError } = await supabase
    .from(USERS_TABLE)
    .select('id, status, updated_at')
    .eq('id', userId)
    .single();
  if (findError || !userRow) {
    logger.error('adminService restoreUser find error', { message: findError && findError.message });
    return { data: null, error: findError || { message: 'User not found' } };
  }
  if (userRow.status !== 'DELETED') {
    return { data: null, error: { message: 'User is not deleted' } };
  }
  const now = new Date();
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      status: 'PENDING',
      updated_at: now.toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    logger.error('adminService restoreUser update error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function listOrders(opts = {}) {
  let query = supabase
    .from(ORDERS_TABLE)
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  query = applyPagination(query, opts);
  const { data, error } = await query;
  if (error) {
    logger.error('adminService listOrders error', { message: error.message });
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

async function listProducts(opts = {}) {
  let query = supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  query = applyPagination(query, opts);
  const { data: products, error } = await query;
  if (error) {
    logger.error('adminService listProducts error', { message: error.message });
    return { data: [], error };
  }
  const list = products || [];
  const merchantIds = [...new Set(list.map((p) => p.merchant_id).filter(Boolean))];
  let merchantMap = {};
  if (merchantIds.length > 0) {
    const { data: users } = await supabase
      .from(USERS_TABLE)
      .select('id, name, company_name')
      .in('id', merchantIds);
    merchantMap = (users || []).reduce((acc, u) => {
      acc[u.id] = u.name || u.company_name || '-';
      return acc;
    }, {});
  }
  const withMerchant = list.map((p) => ({
    ...p,
    merchant_name: p.merchant_id ? (merchantMap[p.merchant_id] || '-') : '-',
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
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .update(updates)
    .eq('id', productId)
    .select()
    .single();
  if (error) {
    logger.error('adminService adminUpdateProduct error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function adminDeleteProduct(productId) {
  const { error } = await supabase
    .from(PRODUCTS_TABLE)
    .delete()
    .eq('id', productId);
  if (error) {
    logger.error('adminService adminDeleteProduct error', { message: error.message });
    return { error };
  }
  return { error: null };
}

async function getPlatformEarnings() {
  const { data: rows, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select('commission_amount, tax_penalty_amount, order_id, created_at')
    .eq('type', 'order_settlement');
  if (error) {
    logger.error('adminService getPlatformEarnings error', { message: error.message });
    return { data: null, error };
  }
  const list = rows || [];
  const total_commission = list.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
  const total_tax_penalty = list.reduce((s, r) => s + Number(r.tax_penalty_amount || 0), 0);
  const platform_earnings = total_commission + total_tax_penalty;
  return {
    data: {
      total_commission: Math.round(total_commission * 100) / 100,
      total_tax_penalty: Math.round(total_tax_penalty * 100) / 100,
      platform_earnings: Math.round(platform_earnings * 100) / 100,
      transactions_count: list.length,
    },
    error: null,
  };
}

export { listUsers, updateUserStatus, listOrders, listProducts, adminUpdateProduct, adminDeleteProduct, getPlatformEarnings, softDeleteUser, restoreUser };
