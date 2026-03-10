/**
 * Subscription service: free/paid, start/end dates, status.
 * Default model:
 * - MERCHANT: اشتراك مجاني دائم (يُستخدم الحقل فقط للعرض في الواجهة).
 * - BROKER: ٦ أشهر مجانية (free) ثم تعتمد المنصة على تاريخ الانتهاء لتقييد المزايا.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

const USERS_TABLE = 'users';

// يُستخدم في حال احتجنا فترة تجريبية افتراضية (حالياً ٦ أشهر = 180 يوم للوسيط)
const DEFAULT_FREE_DAYS = 180;

/**
 * Get subscription for a user (merchant).
 * @returns {Promise<{ data: { subscription_type, subscription_start_date, subscription_end_date, subscription_status } | null, error }>}
 */
async function getSubscription(userId) {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('subscription_type, subscription_start_date, subscription_end_date, subscription_status')
    .eq('id', userId)
    .single();
  if (error) {
    logger.error('subscriptionService getSubscription error', { message: error.message });
    return { data: null, error };
  }
  const sub = {
    subscription_type: data && data.subscription_type != null ? data.subscription_type : 'free',
    subscription_start_date: data && data.subscription_start_date != null ? data.subscription_start_date : null,
    subscription_end_date: data && data.subscription_end_date != null ? data.subscription_end_date : null,
    subscription_status: data && data.subscription_status != null ? data.subscription_status : 'active',
  };
  return { data: sub, error: null };
}

/**
 * Check if subscription is currently active (within end date or no end date).
 */
function isActive(sub) {
  if (!sub) return false;
  if (sub.subscription_status === 'expired') return false;
  const end = sub.subscription_end_date ? new Date(sub.subscription_end_date) : null;
  if (end && end < new Date()) return false;
  return true;
}

/**
 * Ensure merchant has free trial set (start today, end + DEFAULT_FREE_DAYS).
 * Call on first login or when subscription_end_date is null for MERCHANT.
 */
async function setFreeTrial(userId) {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + DEFAULT_FREE_DAYS);
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      subscription_type: 'free',
      subscription_start_date: start.toISOString(),
      subscription_end_date: end.toISOString(),
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('subscription_type, subscription_start_date, subscription_end_date, subscription_status')
    .single();
  if (error) {
    logger.error('subscriptionService setFreeTrial error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Check if merchant can add products.
 * - MERCHANT: مجاني دائماً؛ الوحيد الذي يمنع هو SUSPENDED.
 * - BROKER: لا يُستخدم هنا؛ يوجد فحص منفصل لمزايا الوسيط.
 * Uses users.status for suspension (SUSPENDED = blocked).
 */
async function canAddProducts(userId) {
  const { data: user, error } = await supabase
    .from(USERS_TABLE)
    .select('id, role, status, subscription_type, subscription_end_date, subscription_status')
    .eq('id', userId)
    .single();
  if (error || !user) return { allowed: false, reason: 'User not found' };
  const role = (user.role || '').toString().toUpperCase();
  if (user.status === 'SUSPENDED') {
    const code = role === 'BROKER' ? 'BROKER_SUSPENDED' : 'MERCHANT_SUSPENDED';
    return { allowed: false, reason: code };
  }

  // Merchants: الاشتراك مجاني دائماً، طالما المتجر غير معلّق
  if (role === 'MERCHANT') {
    return { allowed: true, reason: null };
  }

  const sub = {
    subscription_type: user.subscription_type,
    subscription_end_date: user.subscription_end_date,
    subscription_status: user.subscription_status,
  };
  if (!isActive(sub)) return { allowed: false, reason: 'SUBSCRIPTION_EXPIRED' };
  return { allowed: true, reason: null };
}

/**
 * Check if broker can use broker-specific features (sharing products, etc.).
 * BROKER: ٦ أشهر مجانية (free) ثم تُعتبر المزايا منتهية عند انتهاء الفترة.
 */
async function canUseBrokerFeatures(userId) {
  const { data: user, error } = await supabase
    .from(USERS_TABLE)
    .select('id, role, status, subscription_type, subscription_end_date, subscription_status')
    .eq('id', userId)
    .single();
  if (error || !user) return { allowed: false, reason: 'User not found' };
  const role = (user.role || '').toString().toUpperCase();
  if (role !== 'BROKER') return { allowed: false, reason: 'NOT_BROKER' };
  if (user.status === 'SUSPENDED') return { allowed: false, reason: 'BROKER_SUSPENDED' };
  const sub = {
    subscription_type: user.subscription_type,
    subscription_end_date: user.subscription_end_date,
    subscription_status: user.subscription_status,
  };
  if (!isActive(sub)) return { allowed: false, reason: 'BROKER_SUBSCRIPTION_EXPIRED' };
  return { allowed: true, reason: null };
}

/**
 * Update subscription end date (renewal). Optionally set type to 'paid'.
 */
async function renewSubscription(userId, endDate, type = 'paid') {
  const end = endDate ? new Date(endDate) : new Date();
  if (type === 'free') end.setDate(end.getDate() + DEFAULT_FREE_DAYS);
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      subscription_type: type === 'free' ? 'free' : 'paid',
      subscription_end_date: end.toISOString(),
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('subscription_type, subscription_start_date, subscription_end_date, subscription_status')
    .single();
  if (error) {
    logger.error('subscriptionService renewSubscription error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Mark subscription as expired (e.g. cron or when end date passed).
 */
async function markExpired(userId) {
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({ subscription_status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    logger.error('subscriptionService markExpired error', { message: error.message });
    return { error };
  }
  return { error: null };
}

export {
  getSubscription,
  isActive,
  setFreeTrial,
  canAddProducts,
  canUseBrokerFeatures,
  renewSubscription,
  markExpired,
  DEFAULT_FREE_DAYS,
};
