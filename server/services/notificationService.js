/**
 * Notification service: create, list by user, mark read.
 * Types: new_product, like, comment. reference_id = product_id or comment id as needed.
 */

import { supabase } from '../config/supabaseClient.js';

const TABLE = 'notifications';
const VALID_TYPES = ['new_product', 'like', 'comment', 'follow'];

async function create(userId, type, referenceId, message = null) {
  if (!VALID_TYPES.includes(type)) {
    return { data: null, error: { message: 'Invalid notification type' } };
  }
  const row = {
    user_id: userId,
    type,
    reference_id: referenceId,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  if (message != null) row.message = String(message);
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('[notificationService] create error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/** Create new_product notification for all followers of a merchant (when merchant creates a product). */
async function notifyFollowersNewProduct(merchantId, productId) {
  const { data: followers, error: fetchError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', merchantId);
  if (fetchError || !followers || followers.length === 0) {
    return { created: 0, error: fetchError };
  }
  const now = new Date().toISOString();
  const rows = followers.map((f) => ({
    user_id: f.follower_id,
    type: 'new_product',
    reference_id: productId,
    is_read: false,
    created_at: now,
  }));
  const { error: insertError } = await supabase.from(TABLE).insert(rows);
  if (insertError) {
    console.error('[notificationService] notifyFollowersNewProduct error:', insertError.message);
    return { created: 0, error: insertError };
  }
  return { created: rows.length, error: null };
}

/** Notify merchant when a customer follows them (reference_id = customer_id, message = customer info). */
async function notifyMerchantFollow(merchantId, customerId) {
  const { data: customer, error: fetchErr } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', customerId)
    .single();
  if (fetchErr || !customer) {
    return create(merchantId, 'follow', customerId);
  }
  const name = (customer.name || '').trim() || (customer.email || '').split('@')[0] || 'زبون';
  const msg = `${name} قام بمتابعتك`;
  if ((customer.email || '').trim()) {
    return create(merchantId, 'follow', customerId, `${msg} · ${customer.email}`);
  }
  return create(merchantId, 'follow', customerId, msg);
}

/** Notify merchant when someone comments on their product (reference_id = product_id). */
async function notifyMerchantComment(merchantId, productId) {
  return create(merchantId, 'comment', productId);
}

/** Notify all admin users when someone comments on any product. */
async function notifyAdminComment(productId) {
  const { data: admins, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'ADMIN');
  if (fetchError || !(admins && admins.length)) return { created: 0, error: fetchError };
  for (const admin of admins) {
    await create(admin.id, 'comment', productId);
  }
  return { created: admins.length, error: null };
}

/** Notify all brokers who shared this product when someone comments on it. */
async function notifyBrokersSharedProductComment(productId) {
  const { data: shares, error: fetchError } = await supabase
    .from('shared_products')
    .select('broker_id')
    .eq('product_id', productId);
  if (fetchError || !(shares && shares.length)) return { created: 0, error: fetchError };
  const brokerIds = [...new Set(shares.map((s) => s.broker_id))];
  for (const brokerId of brokerIds) {
    await create(brokerId, 'comment', productId);
  }
  return { created: brokerIds.length, error: null };
}

async function listByUserId(userId, options = {}) {
  const { unreadOnly = false } = options;
  let q = supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (unreadOnly) q = q.eq('is_read', false);
  const { data, error } = await q;
  if (error) {
    console.error('[notificationService] listByUserId error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

async function markRead(notificationId, userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) {
    console.error('[notificationService] markRead error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

export {
  create,
  notifyMerchantFollow,
  notifyFollowersNewProduct,
  notifyMerchantComment,
  notifyAdminComment,
  notifyBrokersSharedProductComment,
  listByUserId,
  markRead,
};
