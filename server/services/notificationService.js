/**
 * Notification service: create, list by user, mark read.
 * Types: new_product, like, comment. reference_id = product_id or comment id as needed.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

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
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) {
    logger.error('notificationService create error', { message: error.message });
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
    logger.error('notificationService notifyFollowersNewProduct error', { message: insertError.message });
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

/** Notify all admin users when someone comments on any product. (Batch insert.) */
async function notifyAdminComment(productId) {
  const { data: admins, error: fetchError } = await supabase.from('users').select('id').eq('role', 'ADMIN');
  if (fetchError || !(admins && admins.length)) return { created: 0, error: fetchError };
  const now = new Date().toISOString();
  const rows = admins.map((a) => ({
    user_id: a.id,
    type: 'comment',
    reference_id: productId,
    is_read: false,
    created_at: now,
  }));
  const { error: insertError } = await supabase.from(TABLE).insert(rows);
  if (insertError) {
    logger.error('notificationService notifyAdminComment insert error', { message: insertError.message });
    return { created: 0, error: insertError };
  }
  return { created: rows.length, error: null };
}

/** Notify all brokers who shared this product when someone comments on it. (Batch insert.) */
async function notifyBrokersSharedProductComment(productId) {
  const { data: shares, error: fetchError } = await supabase
    .from('shared_products')
    .select('broker_id')
    .eq('product_id', productId);
  if (fetchError || !(shares && shares.length)) return { created: 0, error: fetchError };
  const brokerIds = [...new Set(shares.map((s) => s.broker_id))];
  const now = new Date().toISOString();
  const rows = brokerIds.map((brokerId) => ({
    user_id: brokerId,
    type: 'comment',
    reference_id: productId,
    is_read: false,
    created_at: now,
  }));
  const { error: insertError } = await supabase.from(TABLE).insert(rows);
  if (insertError) {
    logger.error('notificationService notifyBrokersSharedProductComment insert error', {
      message: insertError.message,
    });
    return { created: 0, error: insertError };
  }
  return { created: rows.length, error: null };
}

async function listByUserId(userId, options = {}) {
  const { unreadOnly = false } = options;
  const { limit, offset } = parsePagination(options);
  let q = supabase.from(TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (unreadOnly) q = q.eq('is_read', false);
  q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) {
    logger.error('notificationService listByUserId error', { message: error.message });
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
    logger.error('notificationService markRead error', { message: error.message });
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
