/**
 * Admin API – products, orders. Requires ADMIN role.
 * Uses shared api() from api/client for consistent auth and 401 handling.
 */

import { api } from '../api/client';

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

export async function getAdminSettings(): Promise<{ success: boolean; settings: { commission_rate: number; tax_penalty_rate: number } }> {
  return api<{ success: boolean; settings: { commission_rate: number; tax_penalty_rate: number } }>('/api/admin/settings');
}

export async function updateAdminSettings(body: { commission_rate?: number; tax_penalty_rate?: number }): Promise<{ success: boolean; settings: { commission_rate: number; tax_penalty_rate: number } }> {
  return api<{ success: boolean; settings: { commission_rate: number; tax_penalty_rate: number } }>('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function getAdminPlatformEarnings(): Promise<{
  success: boolean;
  total_commission: number;
  total_tax_penalty: number;
  platform_earnings: number;
  transactions_count: number;
}> {
  return api<any>('/api/admin/platform-earnings');
}
