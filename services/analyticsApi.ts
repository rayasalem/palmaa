/**
 * Read-only analytics API client for admin and merchant dashboards.
 * Uses new /api/analytics endpoints added on the server.
 */

import { api } from './api/client';

export interface SalesByDayRow {
  date: string;
  orders: number;
  sales: number;
}

export interface TopProductRow {
  product_id: string;
  total_quantity: number;
}

export interface AnalyticsOverview {
  totalSales: number;
  totalOrders: number;
  salesByDay: SalesByDayRow[];
  topProducts: TopProductRow[];
}

export async function getAdminAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await api<{ success: boolean; data: AnalyticsOverview }>('/api/analytics/admin/overview');
  if (!res.success || !res.data) {
    throw new Error('Failed to load admin analytics');
  }
  return res.data;
}

export async function getMerchantAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await api<{ success: boolean; data: AnalyticsOverview }>('/api/analytics/merchant/overview');
  if (!res.success || !res.data) {
    throw new Error('Failed to load merchant analytics');
  }
  return res.data;
}

