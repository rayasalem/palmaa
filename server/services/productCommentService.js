/**
 * Product comment service: add comment, list comments. DB: product_comments table.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

const TABLE = 'product_comments';

async function addComment(productId, userId, content) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      product_id: productId,
      user_id: userId,
      content: String(content).trim(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    logger.error('productCommentService addComment error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

async function getComments(productId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('productCommentService getComments error', { message: error.message });
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

export { addComment, getComments };
