/**
 * Product service: CRUD against Supabase products table.
 * All writes are merchant-scoped (merchant_id = req.auth.sub).
 */

import { supabase } from '../config/supabaseClient.js';

const PRODUCTS_TABLE = 'products';

async function getActiveProducts() {
  const { data: products, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .or('status.eq.active,is_active.eq.true')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[productService] getActiveProducts error:', error.message);
    return { data: [], error };
  }
  const list = products || [];
  const merchantIds = [...new Set(list.map((p) => p.merchant_id).filter(Boolean))];
  if (merchantIds.length === 0) return { data: list, error: null };
  const { data: suspended } = await supabase
    .from('users')
    .select('id')
    .in('id', merchantIds)
    .eq('status', 'SUSPENDED');
  const suspendedSet = new Set((suspended || []).map((u) => u.id));
  const filtered = list.filter((p) => !suspendedSet.has(p.merchant_id));
  return { data: filtered, error: null };
}

async function getProductById(id) {
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('[productService] getProductById error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

async function getProductsByMerchantId(merchantId) {
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[productService] getProductsByMerchantId error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

async function createProduct(merchantId, payload) {
  const price = Number(payload.price ?? payload.price_ils) || 0;
  const stock = Number(payload.stock) || 0;
  const isActive = payload.isActive !== undefined ? payload.isActive : true;
  const images = payload.images?.length ? payload.images : (payload.image_url ? [payload.image_url] : []);
  const row = {
    merchant_id: merchantId,
    title: payload.name ?? payload.title,
    name: payload.name ?? payload.title,
    description: payload.description ?? '',
    price,
    price_ils: price,
    stock,
    category: payload.category ?? 'other',
    status: isActive ? 'active' : 'inactive',
    is_active: isActive,
    images,
    image_url: images[0] ?? '',
    is_bestseller: payload.is_bestseller ?? false,
    sku: payload.sku,
    weight: payload.weight,
    dimensions: payload.dimensions,
    tags: payload.tags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('[productService] createProduct error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

async function updateProduct(productId, merchantId, payload) {
  const updates = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) {
    updates.title = payload.name;
    updates.name = payload.name;
  }
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.price !== undefined || payload.price_ils !== undefined) {
    const p = Number(payload.price_ils ?? payload.price ?? 0);
    updates.price = p;
    updates.price_ils = p;
  }
  if (payload.stock !== undefined) updates.stock = Number(payload.stock);
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.isActive !== undefined) {
    updates.status = payload.isActive ? 'active' : 'inactive';
    updates.is_active = payload.isActive;
  }
  if (payload.images) {
    updates.images = payload.images;
    updates.image_url = payload.images[0] ?? '';
  } else if (payload.image_url !== undefined) {
    updates.image_url = payload.image_url;
  }
  if (payload.sku !== undefined) updates.sku = payload.sku;
  if (payload.weight !== undefined) updates.weight = payload.weight;
  if (payload.dimensions !== undefined) updates.dimensions = payload.dimensions;
  if (payload.tags !== undefined) updates.tags = payload.tags;

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .update(updates)
    .eq('id', productId)
    .eq('merchant_id', merchantId)
    .select()
    .single();
  if (error) {
    console.error('[productService] updateProduct error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Decrement product stock by quantity. Used when order is paid.
 * Returns { error } - null on success.
 */
async function decrementStock(productId, quantity) {
  const qty = Math.max(1, Number(quantity));
  const { data: product, error: fetchErr } = await supabase
    .from(PRODUCTS_TABLE)
    .select('id, stock')
    .eq('id', productId)
    .single();
  if (fetchErr || !product) {
    console.error('[productService] decrementStock fetch error:', fetchErr?.message);
    return { error: fetchErr || { message: 'Product not found' } };
  }
  const currentStock = Number(product.stock) ?? 0;
  const newStock = Math.max(0, currentStock - qty);
  const { error: updateErr } = await supabase
    .from(PRODUCTS_TABLE)
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (updateErr) {
    console.error('[productService] decrementStock update error:', updateErr.message);
    return { error: updateErr };
  }
  return { error: null };
}

async function deleteProduct(productId, merchantId) {
  const { error } = await supabase
    .from(PRODUCTS_TABLE)
    .delete()
    .eq('id', productId)
    .eq('merchant_id', merchantId);
  if (error) {
    console.error('[productService] deleteProduct error:', error.message);
    return { error };
  }
  return { error: null };
}

export {
  getActiveProducts,
  getProductById,
  getProductsByMerchantId,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementStock,
  PRODUCTS_TABLE,
};
