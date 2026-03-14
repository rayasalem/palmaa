/**
 * Offers (العروض) — public list + admin CRUD.
 */

import { getApiBase } from '../api/client';
import { api } from '../api/client';

export interface ShopOffer {
  id: string;
  type: 'custom' | 'product';
  title: string;
  subtitle?: string | null;
  discount_label: number;
  image_url?: string | null;
  product_id?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** عام — قائمة العروض النشطة للمتجر/الكتالوج */
export async function getOffers(): Promise<{ success: boolean; offers: ShopOffer[] }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/offers`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, offers: [] };
  return { success: !!data.success, offers: data.offers || [] };
}

/** أدمن — قائمة كل العروض */
export async function getAdminOffers(): Promise<{ success: boolean; offers: ShopOffer[] }> {
  return api<{ success: boolean; offers: ShopOffer[] }>('/api/admin/offers');
}

/** أدمن — إضافة عرض */
export async function createOffer(payload: Partial<ShopOffer>): Promise<{ success: boolean; offer?: ShopOffer }> {
  const res = await api<{ success: boolean; offer: ShopOffer }>('/api/admin/offers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res;
}

/** أدمن — تحديث عرض */
export async function updateOffer(id: string, payload: Partial<ShopOffer>): Promise<{ success: boolean; offer?: ShopOffer }> {
  return api<{ success: boolean; offer: ShopOffer }>(`/api/admin/offers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** أدمن — حذف عرض */
export async function deleteOffer(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/api/admin/offers/${id}`, { method: 'DELETE' });
}
