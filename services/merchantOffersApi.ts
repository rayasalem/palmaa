/**
 * Merchant offers API — التاجر يدير عروضه (خصم على منتج / تصنيف / الكل + مدة).
 */

import { api } from '../api/client';

export interface MerchantOffer {
  id: string;
  merchant_id: string;
  scope: 'product' | 'category' | 'all';
  product_id?: string | null;
  category?: string | null;
  discount_label: number;
  title: string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export async function getMerchantOffers(): Promise<{ success: boolean; offers: MerchantOffer[] }> {
  return api<{ success: boolean; offers: MerchantOffer[] }>('/api/merchant/offers');
}

export async function createMerchantOffer(payload: Partial<MerchantOffer>): Promise<{ success: boolean; offer?: MerchantOffer }> {
  const res = await api<{ success: boolean; offer: MerchantOffer }>('/api/merchant/offers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res;
}

export async function updateMerchantOffer(id: string, payload: Partial<MerchantOffer>): Promise<{ success: boolean; offer?: MerchantOffer }> {
  const res = await api<{ success: boolean; offer: MerchantOffer }>(`/api/merchant/offers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res;
}

export async function deleteMerchantOffer(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/api/merchant/offers/${id}`, { method: 'DELETE' });
}
