/**
 * Merchant offers: التاجر يضيف خصومات على منتج أو تصنيف أو كل منتجاته، مع مدة اختيارية.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

const TABLE = 'merchant_offers';

function isOfferWithinDates(offer) {
  const now = new Date();
  if (offer.starts_at && new Date(offer.starts_at) > now) return false;
  if (offer.ends_at && new Date(offer.ends_at) <= now) return false;
  return true;
}

export async function listByMerchant(merchantId) {
  if (!merchantId) return { data: [], error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('merchant_id', merchantId)
    .order('sort_order', { ascending: true });
  if (error) {
    logger.error('merchantOffersService listByMerchant', { message: error.message });
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

export async function getApplicableMerchantOffersForProduct(merchantId, productId, productCategory) {
  if (!merchantId) return { data: [], error: null };
  const { data: all, error } = await supabase
    .from(TABLE)
    .select('id, discount_label, scope, product_id, category, starts_at, ends_at')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    logger.error('merchantOffersService getApplicableMerchantOffersForProduct', { message: error.message });
    return { data: [], error };
  }
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

/** كل العروض النشطة (ضمن المدة) لعدد من التجار — لاستخدامها عند حساب أسعار الكتالوج */
export async function listActiveByMerchantIds(merchantIds) {
  if (!merchantIds || merchantIds.length === 0) return { data: [], error: null };
  const ids = [...new Set(merchantIds.filter(Boolean))];
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, merchant_id, discount_label, scope, product_id, category, starts_at, ends_at')
    .in('merchant_id', ids)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    logger.error('merchantOffersService listActiveByMerchantIds', { message: error.message });
    return { data: [], error };
  }
  const list = (data || []).filter(isOfferWithinDates);
  return { data: list, error: null };
}

export async function create(merchantId, payload) {
  const scope = payload.scope === 'category' || payload.scope === 'all' ? payload.scope : 'product';
  const row = {
    merchant_id: merchantId,
    scope,
    product_id: scope === 'product' ? (payload.product_id ?? null) : null,
    category: scope === 'category' ? (payload.category || null) : null,
    discount_label: Math.max(0, parseInt(payload.discount_label, 10) || 0),
    title: payload.title || '',
    starts_at: payload.starts_at ?? null,
    ends_at: payload.ends_at ?? null,
    is_active: payload.is_active !== false,
    sort_order: parseInt(payload.sort_order, 10) || 0,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) {
    logger.error('merchantOffersService create', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

export async function update(id, merchantId, payload) {
  const { data: existing, error: findErr } = await supabase.from(TABLE).select('id').eq('id', id).eq('merchant_id', merchantId).single();
  if (findErr || !existing) return { data: null, error: findErr || new Error('Not found') };
  const updates = { updated_at: new Date().toISOString() };
  if (payload.scope !== undefined) {
    const scope = payload.scope === 'category' || payload.scope === 'all' ? payload.scope : 'product';
    updates.scope = scope;
    updates.product_id = scope === 'product' ? (payload.product_id ?? null) : null;
    updates.category = scope === 'category' ? (payload.category || null) : null;
  } else {
    if (payload.product_id !== undefined) updates.product_id = payload.product_id ?? null;
    if (payload.category !== undefined) updates.category = payload.category || null;
  }
  if (payload.discount_label !== undefined) updates.discount_label = Math.max(0, parseInt(payload.discount_label, 10) || 0);
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.starts_at !== undefined) updates.starts_at = payload.starts_at ?? null;
  if (payload.ends_at !== undefined) updates.ends_at = payload.ends_at ?? null;
  if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);
  if (payload.sort_order !== undefined) updates.sort_order = parseInt(payload.sort_order, 10) || 0;

  const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).eq('merchant_id', merchantId).select().single();
  if (error) {
    logger.error('merchantOffersService update', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

export async function remove(id, merchantId) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('merchant_id', merchantId);
  if (error) {
    logger.error('merchantOffersService remove', { message: error.message });
    return { error };
  }
  return { error: null };
}
