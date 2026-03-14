/**
 * Offers (العروض) for shop section. Admin manages; public list for catalog/shop.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

const TABLE = 'shop_offers';

export async function listActive() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    logger.error('offersService listActive', { message: error.message });
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

export async function listForAdmin() {
  const { data, error } = await supabase.from(TABLE).select('*').order('sort_order', { ascending: true });
  if (error) {
    logger.error('offersService listForAdmin', { message: error.message });
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

export async function getById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function create(payload) {
  const row = {
    type: payload.type === 'product' ? 'product' : 'custom',
    title: payload.title || '',
    subtitle: payload.subtitle ?? null,
    discount_label: Math.max(0, parseInt(payload.discount_label, 10) || 0),
    image_url: payload.image_url ?? null,
    product_id: payload.product_id ?? null,
    sort_order: parseInt(payload.sort_order, 10) || 0,
    is_active: payload.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) {
    logger.error('offersService create', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

export async function update(id, payload) {
  const updates = { updated_at: new Date().toISOString() };
  if (payload.type !== undefined) updates.type = payload.type === 'product' ? 'product' : 'custom';
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.subtitle !== undefined) updates.subtitle = payload.subtitle;
  if (payload.discount_label !== undefined) updates.discount_label = Math.max(0, parseInt(payload.discount_label, 10) || 0);
  if (payload.image_url !== undefined) updates.image_url = payload.image_url;
  if (payload.product_id !== undefined) updates.product_id = payload.product_id;
  if (payload.sort_order !== undefined) updates.sort_order = parseInt(payload.sort_order, 10) || 0;
  if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);

  const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
  if (error) {
    logger.error('offersService update', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

export async function remove(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    logger.error('offersService remove', { message: error.message });
    return { error };
  }
  return { error: null };
}
