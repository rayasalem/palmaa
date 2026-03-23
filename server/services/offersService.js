/**
 * Offers (العروض) for shop section. Admin manages; public list for catalog/shop.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';
import { sanitizeShopOfferMedia } from '../utils/ensureHttpsUrl.js';

const TABLE = 'shop_offers';

function isOfferWithinDates(offer) {
  const now = new Date();
  if (offer.starts_at && new Date(offer.starts_at) > now) return false;
  if (offer.ends_at && new Date(offer.ends_at) <= now) return false;
  return true;
}

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
  const list = (data || []).filter(isOfferWithinDates).map((o) => sanitizeShopOfferMedia(o));
  return { data: list, error: null };
}

export async function listForAdmin() {
  const { data, error } = await supabase.from(TABLE).select('*').order('sort_order', { ascending: true });
  if (error) {
    logger.error('offersService listForAdmin', { message: error.message });
    return { data: [], error };
  }
  return { data: (data || []).map((o) => sanitizeShopOfferMedia(o)), error: null };
}

export async function getById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error) return { data: null, error };
  return { data: data ? sanitizeShopOfferMedia(data) : null, error: null };
}

/** عرض منتج نشط لـ product_id معيّن (نطاق product) — للتوافق مع السلة */
export async function getActiveOfferForProduct(productId) {
  if (!productId) return { data: null, error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, discount_label, starts_at, ends_at')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(5);
  if (error) {
    logger.error('offersService getActiveOfferForProduct', { message: error.message });
    return { data: null, error };
  }
  const one = (Array.isArray(data) ? data : []).find((o) => isOfferWithinDates(o));
  return { data: one || null, error: null };
}

/** عروض تنطبق على منتج (product_id أو category أو all) ضمن المدة — نختار الأعلى خصماً */
export async function getApplicableOffersForProduct(productId, productCategory) {
  const { data: all, error } = await supabase
    .from(TABLE)
    .select('id, discount_label, scope, product_id, category, starts_at, ends_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    logger.error('offersService getApplicableOffersForProduct', { message: error.message });
    return { data: [], error };
  }
  const now = new Date();
  const applicable = (all || []).filter((o) => {
    if (!isOfferWithinDates(o)) return false;
    const scope = o.scope || 'product';
    if (scope === 'product') return o.product_id === productId;
    if (scope === 'category') return o.category && String(o.category).trim() === String(productCategory || '').trim();
    if (scope === 'all') return true;
    return false;
  });
  const byPriority = applicable.sort((a, b) => (Number(b.discount_label) || 0) - (Number(a.discount_label) || 0));
  return { data: byPriority, error: null };
}

export async function create(payload) {
  const scope = payload.scope === 'category' || payload.scope === 'all' ? payload.scope : 'product';
  const row = {
    type: payload.type === 'product' ? 'product' : 'custom',
    title: payload.title || '',
    subtitle: payload.subtitle ?? null,
    discount_label: Math.max(0, parseInt(payload.discount_label, 10) || 0),
    image_url: payload.image_url ?? null,
    product_id: scope === 'product' ? (payload.product_id ?? null) : null,
    sort_order: parseInt(payload.sort_order, 10) || 0,
    is_active: payload.is_active !== false,
    scope: scope,
    category: scope === 'category' ? (payload.category || null) : null,
    starts_at: payload.starts_at ?? null,
    ends_at: payload.ends_at ?? null,
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
  if (payload.scope !== undefined) updates.scope = payload.scope === 'category' || payload.scope === 'all' ? payload.scope : 'product';
  if (payload.category !== undefined) updates.category = payload.category || null;
  if (payload.starts_at !== undefined) updates.starts_at = payload.starts_at ?? null;
  if (payload.ends_at !== undefined) updates.ends_at = payload.ends_at ?? null;

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
