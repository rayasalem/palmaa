/**
 * Product like service: like/unlike product. DB: product_likes table.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

const TABLE = 'product_likes';

async function like(productId, userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      product_id: productId,
      user_id: userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return { data: null, error: { message: 'Already liked', code: 'DUPLICATE' } };
    logger.error('productLikeService like error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function unlike(productId, userId) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('product_id', productId)
    .eq('user_id', userId);
  if (error) {
    logger.error('productLikeService unlike error', { message: error.message });
    return { error };
  }
  return { error: null };
}

async function getLikesCount(productId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);
  if (error) {
    logger.error('productLikeService getLikesCount error', { message: error.message });
    return { count: 0, error };
  }
  return { count: count ?? 0, error: null };
}

async function isLiked(productId, userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .limit(1);
  if (error) return { liked: false, error };
  return { liked: data && data.length > 0, error: null };
}

export { like, unlike, getLikesCount, isLiked };
