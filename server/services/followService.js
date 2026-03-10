/**
 * Follow service: customer follows/unfollows merchant. DB: follows table.
 * Prevents duplicate follow via unique constraint; prevents self-follow in controller.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

const TABLE = 'follows';

async function follow(customerId, merchantId) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      follower_id: customerId,
      following_id: merchantId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return { data: null, error: { message: 'Already following', code: 'DUPLICATE' } };
    logger.error('followService follow error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function unfollow(customerId, merchantId) {
  const { error } = await supabase.from(TABLE).delete().eq('follower_id', customerId).eq('following_id', merchantId);
  if (error) {
    logger.error('followService unfollow error', { message: error.message });
    return { error };
  }
  return { error: null };
}

async function getFollowersCount(merchantId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('following_id', merchantId);
  if (error) {
    logger.error('followService getFollowersCount error', { message: error.message });
    return { count: 0, error };
  }
  return { count: count ?? 0, error: null };
}

async function isFollowing(customerId, merchantId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id')
    .eq('follower_id', customerId)
    .eq('following_id', merchantId)
    .limit(1);
  if (error) return { following: false, error };
  return { following: data && data.length > 0, error: null };
}

export { follow, unfollow, getFollowersCount, isFollowing };
