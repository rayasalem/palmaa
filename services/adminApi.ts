/**
 * Admin API – products, orders. Requires ADMIN role.
 */

import { API_BASE } from '../api/client';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers as object) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || (data as any).message || `HTTP ${res.status}`);
  return data as T;
}

export async function getAdminProducts(): Promise<{ success: boolean; products: any[] }> {
  return api<{ success: boolean; products: any[] }>('/api/admin/products');
}

export async function updateAdminProduct(id: string, body: { name?: string; description?: string; price?: number; stock?: number; category?: string; isActive?: boolean; images?: string[] }): Promise<{ success: boolean; product: any }> {
  return api<{ success: boolean; product: any }>(`/api/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteAdminProduct(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' });
}

export async function getAdminOrders(): Promise<{ success: boolean; orders: any[] }> {
  return api<{ success: boolean; orders: any[] }>('/api/admin/orders');
}
