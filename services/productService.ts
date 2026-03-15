/**
 * Product Service – backend API only (GET/POST/PUT/DELETE /api/products).
 * No Supabase, no mock; all data from backend.
 * Fetch guards: getAll and getByMerchantId use a short TTL cache to avoid duplicate requests.
 */

import { db } from './core/storage';
import type { Product, ActionResponse } from '../types';
import { getApiBase, getAuthHeaders } from '../api/client';
import { logger } from '../utils/logger';

const PRODUCTS_FETCH_TTL_MS = 60_000;
let lastGetAllAt = 0;
let lastGetAllResult: Product[] | null = null;
const getByMerchantCache = new Map<string, { at: number; data: Product[] }>();

function invalidateProductCaches(merchantId?: string): void {
  lastGetAllResult = null;
  lastGetAllAt = 0;
  if (merchantId) getByMerchantCache.delete(merchantId);
  else getByMerchantCache.clear();
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(options.headers as object) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || (data as any).message || `HTTP ${res.status}`);
  return data as T;
}

/** يحسب السعر النهائي ونسبة الخصم من حقول الخصم إن لم يُرسَل من الباكند */
function computeDiscountDisplay(row: any, basePrice: number): { final_price: number; discount_percent?: number } {
  const finalFromApi = row.final_price != null ? Number(row.final_price) : null;
  const percentFromApi = row.discount_percent != null ? Number(row.discount_percent) : null;
  if (finalFromApi != null && finalFromApi < basePrice && basePrice > 0) {
    const pct = percentFromApi ?? Math.round((1 - finalFromApi / basePrice) * 100);
    return { final_price: finalFromApi, discount_percent: pct };
  }
  const active = Boolean(row.is_discount_active) && row.discount_value != null && Number(row.discount_value) > 0;
  const now = new Date();
  const startsAt = row.discount_starts_at ? new Date(row.discount_starts_at) : null;
  const endsAt = row.discount_ends_at ? new Date(row.discount_ends_at) : null;
  const within =
    (!startsAt || startsAt.getTime() <= now.getTime()) &&
    (!endsAt || endsAt.getTime() > now.getTime());
  if (!active || basePrice <= 0 || !within) {
    return { final_price: basePrice };
  }
  const value = Number(row.discount_value) || 0;
  const type = row.discount_type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
  let amount = 0;
  if (type === 'PERCENT') amount = (basePrice * Math.min(100, value)) / 100;
  else amount = Math.min(basePrice, value);
  const final_price = Math.max(0, basePrice - amount);
  const discount_percent = basePrice > 0 ? Math.round((amount / basePrice) * 100) : 0;
  return { final_price, discount_percent };
}

function mapDbToProduct(row: any): Product {
  const basePrice = Number(row.price ?? row.price_ils) || 0;
  const { final_price, discount_percent } = computeDiscountDisplay(row, basePrice);
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name || 'Loading...',
    name: row.title || row.name,
    description: row.description,
    price: basePrice,
    price_ils: basePrice,
    stock: row.stock,
    category: row.category,
    image_url: row.image_url || (row.images && row.images[0]),
    imageUrl: row.image_url || (row.images && row.images[0]),
    images: row.images || [],
    isActive: row.status === 'active' || row.is_active,
    is_bestseller: row.is_bestseller,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    created_at: row.created_at,
    condition: row.condition,
    discount_type: row.discount_type,
    discount_value: row.discount_value != null ? Number(row.discount_value) : undefined,
    is_discount_active: Boolean(row.is_discount_active),
    discount_starts_at: row.discount_starts_at,
    discount_ends_at: row.discount_ends_at,
    final_price,
    discount_percent: discount_percent && discount_percent > 0 ? discount_percent : undefined,
  };
}

export const productService = {
  async getAll(): Promise<Product[]> {
    const now = Date.now();
    if (lastGetAllResult !== null && now - lastGetAllAt < PRODUCTS_FETCH_TTL_MS) {
      db.products = lastGetAllResult;
      return lastGetAllResult;
    }
    try {
      const data = await api<{ success: boolean; products: any[] }>('/api/products');
      const list = (data as any).products || [];
      const mapped = list.map(mapDbToProduct);
      db.products = mapped;
      db.persist('products');
      lastGetAllAt = now;
      lastGetAllResult = mapped;
      return mapped;
    } catch (e) {
      logger.error('productService.getAll', { message: e instanceof Error ? e.message : String(e) });
      if (lastGetAllResult !== null) return lastGetAllResult;
      return db.products;
    }
  },

  async fetchById(id: string, forceRefresh = false): Promise<Product | undefined> {
    if (!forceRefresh) {
      const local = db.products.find((p) => p.id === id);
      if (local) return local;
    }
    try {
      const data = await api<{ success: boolean; product: any }>(`/api/products/${id}`);
      const p = (data as any).product;
      if (!p) return undefined;
      return mapDbToProduct(p);
    } catch {
      return undefined;
    }
  },

  /** Server-side catalog page: filtering, sorting, pagination (offset or cursor). Use for public catalog to avoid loading all products. */
  async getCatalogPage(params: {
    limit?: number;
    offset?: number;
    cursor_created_at?: string | null;
    cursor_id?: string | null;
    q?: string | null;
    category?: string | null;
    sort?: 'newest' | 'price_asc' | 'price_desc' | null;
  }): Promise<{
    products: Product[];
    next_cursor_created_at?: string | null;
    next_cursor_id?: string | null;
  }> {
    const sp = new URLSearchParams();
    if (params.limit != null) sp.set('limit', String(params.limit));
    if (params.offset != null) sp.set('offset', String(params.offset));
    if (params.cursor_created_at) sp.set('cursor_created_at', params.cursor_created_at);
    if (params.cursor_id) sp.set('cursor_id', params.cursor_id);
    if (params.q) sp.set('q', params.q);
    if (params.category) sp.set('category', params.category);
    if (params.sort) sp.set('sort', params.sort);
    const query = sp.toString();
    const url = query ? `/api/products?${query}` : '/api/products';
    try {
      const data = await api<{
        success: boolean;
        products: any[];
        next_cursor_created_at?: string | null;
        next_cursor_id?: string | null;
      }>(url);
      const list = (data as any).products || [];
      const products = list.map(mapDbToProduct);
      return {
        products,
        next_cursor_created_at: (data as any).next_cursor_created_at ?? null,
        next_cursor_id: (data as any).next_cursor_id ?? null,
      };
    } catch (e) {
      logger.error('productService.getCatalogPage', { message: e instanceof Error ? e.message : String(e) });
      return { products: [], next_cursor_created_at: null, next_cursor_id: null };
    }
  },

  async getByMerchantId(merchantId: string): Promise<Product[]> {
    const now = Date.now();
    const cached = getByMerchantCache.get(merchantId);
    if (cached && now - cached.at < PRODUCTS_FETCH_TTL_MS) return cached.data;
    try {
      const data = await api<{ success: boolean; products: any[] }>(`/api/products/merchant/${merchantId}`);
      const list = (data as any).products || [];
      const mapped = list.map(mapDbToProduct);
      getByMerchantCache.set(merchantId, { at: now, data: mapped });
      return mapped;
    } catch (e) {
      logger.error('productService.getByMerchantId', {
        message: e instanceof Error ? e.message : String(e),
        merchantId,
      });
      const fallback = getByMerchantCache.get(merchantId);
      if (fallback) return fallback.data;
      return [];
    }
  },

  getById(id: string): Product | undefined {
    return db.products.find((p) => p.id === id);
  },

  async add(merchantId: string, data: Partial<Product>): Promise<ActionResponse<Product>> {
    try {
      const price = Number(data.price_ils ?? data.price) || 0;
      const body = {
        name: data.name,
        description: data.description,
        price,
        price_ils: price,
        stock: data.stock ?? 0,
        category: data.category ?? 'other',
        isActive: data.isActive !== undefined ? data.isActive : true,
        images: data.images && data.images.length ? data.images : data.image_url ? [data.image_url] : [],
        image_url: data.image_url,
        is_bestseller: data.is_bestseller,
        sku: data.sku,
        weight: data.weight,
        dimensions: data.dimensions,
        tags: data.tags,
        condition: data.condition || 'new',
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        is_discount_active: data.is_discount_active,
        discount_starts_at: data.discount_starts_at,
        discount_ends_at: data.discount_ends_at,
      };
      const res = await api<{ success: boolean; product: any }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const p = (res as any).product;
      if (!p) return { success: false, error: 'No product returned' };
      const product = mapDbToProduct(p);
      db.addItem('products', product);
      invalidateProductCaches(merchantId);
      return { success: true, data: product };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to add product' };
    }
  },

  async update(productId: string, data: Partial<Product>): Promise<ActionResponse<Product>> {
    try {
      const body: any = {};
      if (data.name !== undefined) body.name = data.name;
      if (data.description !== undefined) body.description = data.description;
      if (data.price_ils !== undefined || data.price !== undefined) {
        const p = Number(data.price_ils ?? data.price);
        body.price = p;
        body.price_ils = p;
      }
      if (data.stock !== undefined) body.stock = data.stock;
      if (data.category !== undefined) body.category = data.category;
      if (data.isActive !== undefined) body.isActive = data.isActive;
      if (data.images) body.images = data.images;
      if (data.image_url !== undefined) body.image_url = data.image_url;
      if (data.tags !== undefined) body.tags = data.tags;
      if (data.condition !== undefined) body.condition = data.condition;
      if (data.discount_type !== undefined) body.discount_type = data.discount_type;
      if (data.discount_value !== undefined) body.discount_value = data.discount_value;
      if (data.is_discount_active !== undefined) body.is_discount_active = data.is_discount_active;
      if (data.discount_starts_at !== undefined) body.discount_starts_at = data.discount_starts_at;
      if (data.discount_ends_at !== undefined) body.discount_ends_at = data.discount_ends_at;
      const res = await api<{ success: boolean; product: any }>(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const p = (res as any).product;
      if (!p) return { success: false, error: 'No product returned' };
      const product = mapDbToProduct(p);
      db.updateItem('products', productId, product);
      invalidateProductCaches(product.merchant_id || product.merchantId);
      return { success: true, data: product };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update product' };
    }
  },

  async delete(id: string): Promise<ActionResponse<void>> {
    try {
      const existing = db.products.find((p) => p.id === id);
      await api(`/api/products/${id}`, { method: 'DELETE' });
      db.deleteItem('products', id);
      if (existing) invalidateProductCaches(existing.merchant_id || existing.merchantId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to delete product' };
    }
  },

  filter(filters: {
    searchTerm?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: string;
    merchantId?: string;
    categoryId?: string;
    conditionId?: string;
  }) {
    let result = db.products.filter((p) => p.isActive !== false);
    if (filters.merchantId && filters.merchantId !== 'all') {
      result = result.filter((p) => p.merchantId === filters.merchantId || p.merchant_id === filters.merchantId);
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      result = result.filter((p) => p.category === filters.categoryId);
    }
    if (filters.conditionId && filters.conditionId !== 'all') {
      result = result.filter((p) => (p.condition || 'new') === filters.conditionId);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (p) => (p.name || '').toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term)
      );
    }
    if (filters.minPrice !== undefined)
      result = result.filter((p) => (p.price ?? p.price_ils ?? 0) >= filters.minPrice!);
    if (filters.maxPrice !== undefined)
      result = result.filter((p) => (p.price ?? p.price_ils ?? 0) <= filters.maxPrice!);
    if (filters.minRating !== undefined) result = result.filter((p) => (p.rating ?? 0) >= filters.minRating!);
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_asc':
          result = [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
          break;
        case 'price_desc':
          result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
          break;
        case 'newest':
          result = [...result].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          break;
        case 'rating_desc':
          result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
          break;
      }
    }
    return result;
  },

  getCategories(): string[] {
    return Array.from(new Set(db.products.map((p) => p.category).filter(Boolean)));
  },
};
