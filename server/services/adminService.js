/**
 * Admin service: list users, update user status, list orders, products (Supabase).
 */

import { supabase } from '../config/supabaseClient.js';

const USERS_TABLE = 'users';
const ORDERS_TABLE = 'orders';
const PRODUCTS_TABLE = 'products';

async function listUsers() {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, name, role, status, is_email_verified, phone, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[adminService] listUsers error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
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

export { listUsers, updateUserStatus, listOrders, listProducts, adminUpdateProduct, adminDeleteProduct };
