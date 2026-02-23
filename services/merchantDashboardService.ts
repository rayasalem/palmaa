/**
 * Merchant dashboard: subscription + stats from backend.
 */

import { api } from '../api/client';

export interface MerchantSubscription {
  subscription_type: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_status: string;
  is_active: boolean;
}

export interface MerchantStats {
  total_sales: number;
  total_commission: number;
  total_tax_penalty: number;
  net_profit: number;
  transactions?: Array<{
    order_id: string;
    total_amount: number;
    commission_amount: number;
    tax_penalty_amount: number;
    merchant_net_amount: number;
    created_at: string;
  }>;
}

export interface MerchantDashboardResponse {
  success: boolean;
  subscription: MerchantSubscription;
  stats: MerchantStats;
}

export async function getMerchantDashboard(): Promise<MerchantDashboardResponse> {
  const data = await api<MerchantDashboardResponse>('/api/merchant/dashboard');
  if (!data.success) throw new Error('Failed to load dashboard');
  return data;
}
