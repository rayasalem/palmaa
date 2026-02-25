/**
 * Product Service – backend API only (GET/POST/PUT/DELETE /api/products).
 * No Supabase, no mock; all data from backend.
 */

import { db } from './core/storage';
import type { Product, ActionResponse } from '../types';
import { getApiBase, getAuthHeaders } from '../api/client';

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

function mapDbToProduct(row: any): Product {
  return {
    id: row.id,
    merchant_id: row.merchant_id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name || 'Loading...',
    name: row.title || row.name,
    description: row.description,
    price: Number(row.price ?? row.price_ils),
    price_ils: Number(row.price ?? row.price_ils),
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
  };
}

export const productService = {
  async getAll(): Promise<Product[]> {
    try {
      const data = await api<{ success: boolean; products: any[] }>('/api/products');
      const list = (data as any).products || [];
      const mapped = list.map(mapDbToProduct);
      db.products = mapped;
      db.persist('products');
      return mapped;
    } catch (e) {
      console.error('productService.getAll error', e);
      return db.products;
    }
  },

  async fetchById(id: string): Promise<Product | undefined> {
    const local = db.products.find((p) => p.id === id);
    if (local) return local;
    try {
      const data = await api<{ success: boolean; product: any }>(`/api/products/${id}`);
      const p = (data as any).product;
      if (!p) return undefined;
      return mapDbToProduct(p);
    } catch {
      return undefined;
    }
  },

  async getByMerchantId(merchantId: string): Promise<Product[]> {
    try {
      const data = await api<{ success: boolean; products: any[] }>(`/api/products/merchant/${merchantId}`);
      const list = (data as any).products || [];
      return list.map(mapDbToProduct);
    } catch (e) {
      console.error('productService.getByMerchantId error', e);
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
        images: data.images && data.images.length ? data.images : (data.image_url ? [data.image_url] : []),
        image_url: data.image_url,
        is_bestseller: data.is_bestseller,
        sku: data.sku,
        weight: data.weight,
        dimensions: data.dimensions,
        tags: data.tags,
      };
      const res = await api<{ success: boolean; product: any }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const p = (res as any).product;
      if (!p) return { success: false, error: 'No product returned' };
      const product = mapDbToProduct(p);
      db.addItem('products', product);
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
      const res = await api<{ success: boolean; product: any }>(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const p = (res as any).product;
      if (!p) return { success: false, error: 'No product returned' };
      const product = mapDbToProduct(p);
      db.updateItem('products', productId, product);
      return { success: true, data: product };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update product' };
    }
  },

  async delete(id: string): Promise<ActionResponse<void>> {
    try {
      await api(`/api/products/${id}`, { method: 'DELETE' });
      db.deleteItem('products', id);
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
  }) {
    let result = db.products.filter((p) => p.isActive !== false);
    if (filters.merchantId && filters.merchantId !== 'all') {
      result = result.filter((p) => p.merchantId === filters.merchantId || p.merchant_id === filters.merchantId);
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      result = result.filter((p) => p.category === filters.categoryId);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (p) => (p.name || '').toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term)
      );
    }
    if (filters.minPrice !== undefined) result = result.filter((p) => (p.price ?? p.price_ils ?? 0) >= filters.minPrice!);
    if (filters.maxPrice !== undefined) result = result.filter((p) => (p.price ?? p.price_ils ?? 0) <= filters.maxPrice!);
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
