/**
 * Product comment service: add comment, list comments. DB: product_comments table.
 */

import { supabase } from '../config/supabaseClient.js';

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
    console.error('[productCommentService] addComment error:', error.message);
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
    console.error('[productCommentService] getComments error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

export { addComment, getComments };
