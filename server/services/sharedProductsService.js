/**
 * Shared products service: broker shares merchant products with custom marketing.
 * Persists to Supabase shared_products (marketing_title, marketing_description, etc).
 */

import { supabase } from '../config/supabaseClient.js';

const TABLE = 'shared_products';

async function upsert(brokerId, productId, data) {
  const { data: existing } = await supabase
    .from(TABLE)
    .select('id')
    .eq('broker_id', brokerId)
    .eq('product_id', productId)
    .maybeSingle();

  const row = {
    broker_id: brokerId,
    product_id: productId,
    marketing_title: data.marketing_title ?? null,
    marketing_description: data.marketing_description ?? null,
    custom_discount_text: data.custom_discount_text ?? null,
    is_featured: data.is_featured ?? false,
  };

  if ((existing && existing.id)) {
    const { data: updated, error } = await supabase
      .from(TABLE)
      .update(row)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) {
      console.error('[sharedProductsService] update error:', error.message);
      return { data: null, error };
    }
    return { data: updated, error: null };
  }

  const { data: inserted, error } = await supabase
    .from(TABLE)
    .insert({
      ...row,
      clicks: 0,
      sales: 0,
      shared_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error('[sharedProductsService] insert error:', error.message);
    return { data: null, error };
  }
  return { data: inserted, error: null };
}

async function listByBrokerId(brokerId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('broker_id', brokerId)
    .order('shared_at', { ascending: false });
  if (error) {
    console.error('[sharedProductsService] listByBrokerId error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

async function remove(brokerId, productId) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('broker_id', brokerId)
    .eq('product_id', productId);
  if (error) {
    console.error('[sharedProductsService] remove error:', error.message);
    return { error };
  }
  return { error: null };
}

async function toggleFeatured(brokerId, shareId) {
  const { data: share } = await supabase
    .from(TABLE)
    .select('is_featured')
    .eq('id', shareId)
    .eq('broker_id', brokerId)
    .single();
  if (!share) return { data: null, error: { message: 'Share not found' } };
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_featured: !share.is_featured })
    .eq('id', shareId)
    .eq('broker_id', brokerId)
    .select()
    .single();
  if (error) {
    console.error('[sharedProductsService] toggleFeatured error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

export { upsert, listByBrokerId, remove, toggleFeatured };
