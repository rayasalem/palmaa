/**
 * Offers (العروض) — public list + admin CRUD.
 */

import { api } from '../api/client';
import { normalizeOfferImage } from '../utils/secureUrl';

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
  scope?: 'product' | 'category' | 'all';
  category?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** عام — قائمة العروض النشطة للمتجر/الكتالوج */
export async function getOffers(): Promise<{ success: boolean; offers: ShopOffer[] }> {
  try {
    const data = await api<{ success?: boolean; offers?: ShopOffer[] }>('/api/offers');
    const offers = (data.offers || []).map((o) => normalizeOfferImage({ ...o }));
    return { success: !!data.success, offers };
  } catch {
    return { success: false, offers: [] };
  }
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
