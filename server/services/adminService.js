/**
 * Admin service: list users, update user status, list orders, products, platform earnings (Supabase).
 */

import { supabase } from '../config/supabaseClient.js';

const USERS_TABLE = 'users';
const ORDERS_TABLE = 'orders';
const PRODUCTS_TABLE = 'products';
const TRANSACTIONS_TABLE = 'transactions';

async function listUsers() {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, name, role, status, phone, created_at, updated_at, terms_accepted, terms_accepted_at, email_verified')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[adminService] listUsers error:', error.message);
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
    console.error('[adminService] updateUserStatus error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Soft delete user:
 * - Sets status = 'DELETED'
 * - Stores deleted_at timestamp and optional deleted_reason
 * - is_approved reset to false so لا يُعامل كحساب فعّال
 */
async function softDeleteUser(userId, reason) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      status: 'DELETED',
      is_approved: false,
      deleted_at: now,
      deleted_reason: reason || null,
      updated_at: now,
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.error('[adminService] softDeleteUser error:', error.message);
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
    .select('id, status, deleted_at')
    .eq('id', userId)
    .single();
  if (findError || !userRow) {
    console.error('[adminService] restoreUser find error:', (findError && findError.message));
    return { data: null, error: findError || { message: 'User not found' } };
  }
  if (!userRow.deleted_at) {
    return { data: null, error: { message: 'User is not deleted' } };
  }
  const deletedAt = new Date(userRow.deleted_at);
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  if (now.getTime() - deletedAt.getTime() > THIRTY_DAYS_MS) {
    return { data: null, error: { message: 'Restore window (30 days) has expired' } };
  }
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      status: 'PENDING',
      deleted_at: null,
      deleted_reason: null,
      updated_at: now.toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.error('[adminService] restoreUser update error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

async function listOrders() {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[adminService] listOrders error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

async function listProducts() {
  const { data: products, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[adminService] listProducts error:', error.message);
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
    console.error('[adminService] adminUpdateProduct error:', error.message);
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
    console.error('[adminService] adminDeleteProduct error:', error.message);
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
    console.error('[adminService] getPlatformEarnings error:', error.message);
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
