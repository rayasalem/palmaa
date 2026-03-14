/**
 * Basic gamification service: points, loyalty levels, and simple referral rewards.
 * Design goals:
 * - Read/write only new tables (user_points, referrals) so existing flows remain unchanged.
 * - All callers must be wrapped in try/catch so any failure is logged but never breaks payment/order logic.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';
import * as notificationService from './notificationService.js';

const USER_POINTS_TABLE = 'user_points';
const REFERRALS_TABLE = 'referrals';

function computeLevel(totalPoints) {
  const pts = Number(totalPoints) || 0;
  if (pts >= 2000) return 'GOLD';
  if (pts >= 800) return 'SILVER';
  return 'BRONZE';
}

async function getOrCreateUserPoints(userId) {
  if (!userId) return { data: null, error: { message: 'userId required' } };
  const { data, error } = await supabase.from(USER_POINTS_TABLE).select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = row not found
    logger.error('gamificationService getOrCreateUserPoints error', { message: error.message });
    return { data: null, error };
  }
  if (data) return { data, error: null };
  const row = {
    user_id: userId,
    total_points: 0,
    loyalty_level: 'BRONZE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const insert = await supabase.from(USER_POINTS_TABLE).insert(row).select().single();
  if (insert.error) {
    logger.error('gamificationService create user_points error', { message: insert.error.message });
    return { data: null, error: insert.error };
  }
  return { data: insert.data, error: null };
}

/**
 * Award points for a paid order.
 * - customer: points proportional to total_amount
 * - referrer (if affiliate_student_id / referred_by present): small bonus
 */
async function awardForPaidOrder(order) {
  if (!order) return;
  const customerId = order.customer_id || order.customerId;
  const totalAmount = Number(order.total_amount ?? 0);
  if (customerId && totalAmount > 0) {
    await awardPoints(customerId, Math.max(1, Math.round(totalAmount)), {
      reason: 'order_paid',
      orderId: order.id || order.order_reference,
    });
  }

  const referrerId = order.affiliate_student_id || order.referred_by || null;
  if (referrerId && totalAmount > 0) {
    // Smaller bonus for referrer
    const bonus = Math.max(1, Math.round(totalAmount * 0.1));
    await awardReferralPoints(referrerId, order.customer_id || customerId || null, order.id, bonus);
  }
}

async function awardPoints(userId, points, meta = {}) {
  const num = Math.max(0, Number(points) || 0);
  if (!userId || num <= 0) return;
  const { data: existing, error } = await getOrCreateUserPoints(userId);
  if (error || !existing) return;
  const newTotal = (existing.total_points || 0) + num;
  const newLevel = computeLevel(newTotal);
  const levelChanged = newLevel !== existing.loyalty_level;
  const { data: updated, error: updateErr } = await supabase
    .from(USER_POINTS_TABLE)
    .update({
      total_points: newTotal,
      loyalty_level: newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();
  if (updateErr) {
    logger.error('gamificationService awardPoints update error', { message: updateErr.message });
    return;
  }
  if (levelChanged) {
    try {
      const msg =
        newLevel === 'GOLD'
          ? 'مبروك! أصبحت من عملائنا الذهبيين 🎉'
          : newLevel === 'SILVER'
            ? 'مبروك! تمت ترقيتك إلى المستوى الفضي.'
            : 'تم تحديث نقاطك.';
      await notificationService.create(userId, 'loyalty_level_up', null, msg);
    } catch (e) {
      logger.error('gamificationService loyalty notification error', { message: e && e.message });
    }
  }
}

async function awardReferralPoints(referrerId, referredUserId, orderId, rewardPoints) {
  if (!referrerId || !referredUserId) return;
  const pts = Math.max(1, Number(rewardPoints) || 0);
  const row = {
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    order_id: orderId || null,
    reward_points: pts,
    status: 'REWARDED',
    created_at: new Date().toISOString(),
    rewarded_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(REFERRALS_TABLE).insert(row);
  if (error) {
    logger.error('gamificationService awardReferralPoints insert error', { message: error.message });
    return;
  }
  await awardPoints(referrerId, pts, { reason: 'referral', orderId });
  try {
    await notificationService.create(
      referrerId,
      'referral_reward',
      orderId || null,
      'حصلت على نقاط إضافية مقابل إحالة صديق ناجحة.'
    );
  } catch (e) {
    logger.error('gamificationService referral notification error', { message: e && e.message });
  }
}

export { awardForPaidOrder };

