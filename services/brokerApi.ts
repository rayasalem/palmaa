/**
 * Broker API – shared products (persist to Supabase).
 */

import { getApiBase, getAuthHeaders, sanitizeJsonResponse } from '../api/client';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(options.headers as object) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || (data as any).message || `HTTP ${res.status}`);
  return sanitizeJsonResponse(data) as T;
}

export async function upsertSharedProduct(
  productId: string,
  data: {
    marketing_title?: string;
    marketing_description?: string;
    custom_discount_text?: string;
    is_featured?: boolean;
  }
): Promise<{ success: boolean; shared: any }> {
  return api(`/api/broker/shared-products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function listSharedProducts(): Promise<{ success: boolean; shared: any[] }> {
  return api('/api/broker/shared-products');
}

export async function removeSharedProduct(productId: string): Promise<{ success: boolean }> {
  return api(`/api/broker/shared-products/${productId}`, { method: 'DELETE' });
}

export async function toggleSharedFeatured(shareId: string): Promise<{ success: boolean; shared: any }> {
  return api(`/api/broker/shared-products/featured/${shareId}`, { method: 'PATCH' });
}

export async function getPublicSharedProducts(brokerId: string): Promise<{ success: boolean; shared: any[] }> {
  return api(`/api/shared-products?broker_id=${encodeURIComponent(brokerId)}`);
}
