/**
 * Product service: CRUD against Supabase products table.
 * All writes are merchant-scoped (merchant_id = req.auth.sub).
 * List/get responses include merchant_name from users + merchant_profiles.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

const PRODUCTS_TABLE = 'products';
const CATALOG_VIEW = 'catalog_products_view';

function applyDiscount(product) {
  if (!product) return product;
  const now = new Date();
  const startsAt = product.discount_starts_at ? new Date(product.discount_starts_at) : null;
  const endsAt = product.discount_ends_at ? new Date(product.discount_ends_at) : null;
  const withinWindow =
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt > now);
  const active =
    product.is_discount_active &&
    product.discount_value != null &&
    withinWindow;

  const price = Number(product.price) || 0;
  if (!active || price <= 0) {
    return { ...product, final_price: price, discount_amount: 0, discount_percent: 0 };
  }

  const value = Number(product.discount_value) || 0;
  let discountAmount = 0;
  if (product.discount_type === 'PERCENT') {
    discountAmount = (price * value) / 100;
  } else if (product.discount_type === 'AMOUNT') {
    discountAmount = value;
  }
  if (discountAmount < 0) discountAmount = 0;
  if (discountAmount > price) discountAmount = price;
  const final = Math.max(0, price - discountAmount);
  const discountPercent = price > 0 ? Math.round((discountAmount / price) * 100) : 0;

  return {
    ...product,
    final_price: final,
    discount_amount: discountAmount,
    discount_percent: discountPercent,
  };
}

/**
 * Fetch display names for merchant user ids (business_name || company_name || name).
 */
async function getMerchantNamesMap(merchantIds) {
  if (!merchantIds || merchantIds.length === 0) return {};
  const ids = [...new Set(merchantIds.filter(Boolean))];
  const map = {};
  const { data: users, error: uErr } = await supabase.from('users').select('id, name, company_name').in('id', ids);
  if (!uErr && users) {
    for (const u of users) {
      map[u.id] = u.company_name || u.name || 'Merchant';
    }
  }
  const { data: profiles, error: pErr } = await supabase
    .from('merchant_profiles')
    .select('user_id, business_name')
    .in('user_id', ids);
  if (!pErr && profiles) {
    for (const p of profiles) {
      if (p.business_name) map[p.user_id] = p.business_name;
    }
  }
  return map;
}

function attachMerchantNames(products, namesMap) {
  if (!products || !namesMap) return products;
  return products.map((p) => ({
    ...applyDiscount(p),
    merchant_name: p.merchant_id ? namesMap[p.merchant_id] || null : null,
  }));
}

/** Escape for safe use in Supabase ilike: % _ \ and single quote. */
function escapeForLike(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/'/g, "''");
}

/** Max rows per product list request; queries requesting more are rejected. */
const MAX_PRODUCT_LIST_ROWS = 1000;
/** Log product list queries slower than this (ms). */
const SLOW_QUERY_MS = 800;

/**
 * Catalog list: pagination (default 24, max 1000) via offset or cursor; optional search (q) and category filter.
 * When cursor_created_at is provided, uses keyset pagination for stable performance at scale (no large OFFSET).
 */
async function getActiveProducts(opts = {}) {
  const { limit, offset } = parsePagination(opts, 24, MAX_PRODUCT_LIST_ROWS);
  const q = typeof opts.q === 'string' ? opts.q.trim() : '';
  const category = typeof opts.category === 'string' ? opts.category.trim() : '';
  const sort = (typeof opts.sort === 'string' ? opts.sort.trim() : '') || 'newest';
  const cursorCreatedAt = typeof opts.cursor_created_at === 'string' ? opts.cursor_created_at.trim() : '';
  const useCursor = cursorCreatedAt.length > 0 && sort === 'newest';

  const orderBy = sort === 'price_asc' ? 'price' : sort === 'price_desc' ? 'price' : 'created_at';
  const orderAsc = sort === 'price_asc';

  const useFts = q && q.length > 0 && (process.env.USE_PRODUCT_FTS === 'true' || process.env.USE_PRODUCT_FTS === '1');

  const queryStart = Date.now();
  let query = supabase
    .from(CATALOG_VIEW)
    .select('*')
    .eq('is_active', true)
    .in('status', ['active', 'APPROVED'])
    .order(orderBy, { ascending: orderAsc });

  if (category) {
    query = query.eq('category', category);
  }
  if (q && q.length > 0) {
    if (useFts) {
      query = query.textSearch('tsv', q, { type: 'plain', config: 'simple' });
    } else {
      const escaped = escapeForLike(q);
      const pattern = `%${escaped}%`;
      query = query.or(`name.ilike.'${pattern}',title.ilike.'${pattern}',description.ilike.'${pattern}'`);
    }
  }

  if (useCursor) {
    query = query.lt('created_at', cursorCreatedAt).limit(limit);
  } else {
    query = query.range(offset, offset + limit - 1);
  }

  let result = await query;
  const queryMs = Date.now() - queryStart;
  if (queryMs > SLOW_QUERY_MS) {
    logger.warn('slow_query', { query: 'getActiveProducts', durationMs: queryMs, limit, hasCategory: !!category, hasSearch: !!q });
  }
  let { data: products, error } = result;
  if (error && useFts && q && (error.message || '').toLowerCase().includes('tsv')) {
    const fallbackStart = Date.now();
    query = supabase
      .from(CATALOG_VIEW)
      .select('*')
      .or('status.eq.active,is_active.eq.true')
      .order(orderBy, { ascending: orderAsc });
    if (category) query = query.eq('category', category);
    const escaped = escapeForLike(q);
    const pattern = `%${escaped}%`;
    query = query.or(`name.ilike.'${pattern}',title.ilike.'${pattern}',description.ilike.'${pattern}'`);
    if (useCursor) query = query.lt('created_at', cursorCreatedAt).limit(limit);
    else query = query.range(offset, offset + limit - 1);
    result = await query;
    if (Date.now() - fallbackStart > SLOW_QUERY_MS) {
      logger.warn('slow_query', { query: 'getActiveProducts_fallback', durationMs: Date.now() - fallbackStart });
    }
    products = result.data;
    error = result.error;
  }
  if (error) {
    logger.error('productService getActiveProducts error', { message: error.message });
    return { data: [], error, next_cursor_created_at: null, next_cursor_id: null };
  }
  const rawList = products || [];
  const filteredRaw = rawList.filter((p) => p.merchant_status !== 'SUSPENDED');
  const enriched = filteredRaw.map((p) => {
    const { merchant_status, ...rest } = p;
    return applyDiscount(rest);
  });
  let next_cursor_created_at = null;
  let next_cursor_id = null;
  if (enriched.length === limit && enriched.length > 0) {
    const last = enriched[enriched.length - 1];
    next_cursor_created_at = last.created_at || null;
    next_cursor_id = last.id || null;
  }
  return { data: enriched, error: null, next_cursor_created_at, next_cursor_id };
}

async function getProductById(id) {
  const { data, error } = await supabase.from(CATALOG_VIEW).select('*').eq('id', id).single();
  if (error) {
    logger.error('productService getProductById error', { message: error.message });
    return { data: null, error };
  }
  if (!data) return { data: null, error: null };
  const { merchant_status, ...rest } = data;
  return { data: applyDiscount(rest), error: null };
}

async function getProductsByMerchantId(merchantId, opts = {}) {
  // Merchant product listing: default 24, max 1000; pagination forced to avoid heavy queries.
  const { limit, offset } = parsePagination(opts, 24, MAX_PRODUCT_LIST_ROWS);
  const queryStart = Date.now();
  const { data, error } = await supabase
    .from(CATALOG_VIEW)
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (Date.now() - queryStart > SLOW_QUERY_MS) {
    logger.warn('slow_query', { query: 'getProductsByMerchantId', durationMs: Date.now() - queryStart, limit });
  }
  if (error) {
    logger.error('productService getProductsByMerchantId error', { message: error.message });
    return { data: [], error };
  }
  const list = data || [];
  if (list.length === 0) return { data: list, error: null };
  const enriched = list.map((p) => {
    const { merchant_status, ...rest } = p;
    return applyDiscount(rest);
  });
  return { data: enriched, error: null };
}

async function createProduct(merchantId, payload) {
  const price = Number(payload.price ?? payload.price_ils) || 0;
  const stock = Number(payload.stock) || 0;
  const isActive = payload.isActive !== undefined ? payload.isActive : true;
  const images =
    payload.images && payload.images.length ? payload.images : payload.image_url ? [payload.image_url] : [];
  const condition = payload.condition || 'new';
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
    condition,
    images,
    image_url: images[0] ?? '',
    is_bestseller: payload.is_bestseller ?? false,
    sku: payload.sku,
    weight: payload.weight,
    dimensions: payload.dimensions,
    tags: payload.tags,
    discount_type: payload.discount_type ?? null,
    discount_value: payload.discount_value != null ? Number(payload.discount_value) : null,
    is_discount_active: Boolean(payload.is_discount_active),
    discount_starts_at: payload.discount_starts_at ?? null,
    discount_ends_at: payload.discount_ends_at ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(PRODUCTS_TABLE).insert(row).select().single();
  if (error) {
    logger.error('productService createProduct error', { message: error.message });
    return { data: null, error };
  }
  return { data: data ? applyDiscount(data) : null, error: null };
}

const BULK_MAX = 50;
const BULK_BATCH = 10;

/**
 * Bulk create products for a merchant. Processes in batches to avoid overload.
 * Returns { created: Product[], errors: { index: number, message: string }[] }.
 */
async function bulkCreateProducts(merchantId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { created: [], errors: [] };
  }
  const toProcess = items.slice(0, BULK_MAX);
  const created = [];
  const errors = [];
  for (let i = 0; i < toProcess.length; i += BULK_BATCH) {
    const batch = toProcess.slice(i, i + BULK_BATCH);
    const results = await Promise.all(
      batch.map((payload, j) => {
        const idx = i + j;
        const name = payload.name ?? payload.title;
        if (!name || String(name).trim() === '') {
          return Promise.resolve({ index: idx, error: 'name is required' });
        }
        const numPrice = Number(payload.price ?? payload.price_ils);
        if (Number.isNaN(numPrice) || numPrice < 0) {
          return Promise.resolve({ index: idx, error: 'price must be a non-negative number' });
        }
        return createProduct(merchantId, {
          name: String(name).trim(),
          description: payload.description,
          price: numPrice,
          price_ils: numPrice,
          stock: payload.stock,
          category: payload.category,
          isActive: payload.isActive,
          images: payload.images,
          image_url: payload.image_url,
          condition: payload.condition,
          discount_type: payload.discount_type,
          discount_value: payload.discount_value,
          is_discount_active: payload.is_discount_active,
          discount_starts_at: payload.discount_starts_at,
          discount_ends_at: payload.discount_ends_at,
        }).then(({ data, error }) => {
          if (error) return { index: idx, error: error.message || 'Create failed' };
          if (data) created.push(data);
          return null;
        });
      })
    );
    results.forEach((r) => {
      if (r && r.index != null && r.error) errors.push({ index: r.index, message: r.error });
    });
  }
  return { created, errors };
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
  if (payload.condition !== undefined) updates.condition = payload.condition;
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
  if (payload.discount_type !== undefined) updates.discount_type = payload.discount_type;
  if (payload.discount_value !== undefined) updates.discount_value = payload.discount_value;
  if (payload.is_discount_active !== undefined) updates.is_discount_active = payload.is_discount_active;
  if (payload.discount_starts_at !== undefined) updates.discount_starts_at = payload.discount_starts_at;
  if (payload.discount_ends_at !== undefined) updates.discount_ends_at = payload.discount_ends_at;

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .update(updates)
    .eq('id', productId)
    .eq('merchant_id', merchantId)
    .select()
    .single();
  if (error) {
    logger.error('productService updateProduct error', { message: error.message });
    return { data: null, error };
  }
  return { data: data ? applyDiscount(data) : null, error: null };
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
    logger.error('productService decrementStock fetch error', { message: fetchErr && fetchErr.message });
    return { error: fetchErr || { message: 'Product not found' } };
  }
  const currentStock = Number(product.stock) ?? 0;
  const newStock = Math.max(0, currentStock - qty);
  const { error: updateErr } = await supabase
    .from(PRODUCTS_TABLE)
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (updateErr) {
    logger.error('productService decrementStock update error', { message: updateErr.message });
    return { error: updateErr };
  }
  return { error: null };
}

async function deleteProduct(productId, merchantId) {
  const { error } = await supabase.from(PRODUCTS_TABLE).delete().eq('id', productId).eq('merchant_id', merchantId);
  if (error) {
    logger.error('productService deleteProduct error', { message: error.message });
    return { error };
  }
  return { error: null };
}

export {
  applyDiscount,
  getActiveProducts,
  getProductById,
  getProductsByMerchantId,
  createProduct,
  bulkCreateProducts,
  updateProduct,
  deleteProduct,
  decrementStock,
  PRODUCTS_TABLE,
};
