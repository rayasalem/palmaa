/**
 * Read-only analytics service for admin and merchants.
 * Non-breaking: only performs SELECTs on existing tables.
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';
import { ORDERS_TABLE, ORDER_ITEMS_TABLE } from './orderService.js';

async function getAdminOverview() {
  try {
    const totals = await supabase
      .from(ORDERS_TABLE)
      .select('status,total_amount,created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    if (totals.error) throw totals.error;
    const rows = totals.data || [];
    let totalSales = 0;
    let totalOrders = 0;
    const byDay = {};
    for (const o of rows) {
      const st = String(o.status || '').toUpperCase();
      if (st === 'PAID' || st === 'COMPLETED') {
        totalSales += Number(o.total_amount ?? 0);
      }
      totalOrders += 1;
      const day = (o.created_at || '').slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, orders: 0, sales: 0 };
      byDay[day].orders += 1;
      if (st === 'PAID' || st === 'COMPLETED') {
        byDay[day].sales += Number(o.total_amount ?? 0);
      }
    }

    const topProductsRes = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('product_id,quantity')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    if (topProductsRes.error && topProductsRes.error.code !== '42703') {
      // 42703 = column does not exist for created_at on some older schemas
      throw topProductsRes.error;
    }
    const topProductsMap = new Map();
    for (const row of topProductsRes.data || []) {
      const pid = row.product_id;
      const qty = Number(row.quantity) || 0;
      if (!pid || qty <= 0) continue;
      topProductsMap.set(pid, (topProductsMap.get(pid) || 0) + qty);
    }
    const topProducts = Array.from(topProductsMap.entries())
      .map(([product_id, total_quantity]) => ({ product_id, total_quantity }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10);

    return {
      data: {
        totalSales,
        totalOrders,
        salesByDay: Object.values(byDay).sort((a, b) => (a.date < b.date ? -1 : 1)),
        topProducts,
      },
      error: null,
    };
  } catch (err) {
    logger.error('analyticsService getAdminOverview error', { message: err.message });
    return { data: null, error: err };
  }
}

async function getMerchantOverview(merchantId) {
  try {
    if (!merchantId) throw new Error('merchantId is required');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const totals = await supabase
      .from(ORDERS_TABLE)
      .select('status,total_amount,created_at')
      .eq('merchant_id', merchantId)
      .gte('created_at', since);
    if (totals.error) throw totals.error;
    const rows = totals.data || [];
    let totalSales = 0;
    let totalOrders = 0;
    const byDay = {};
    for (const o of rows) {
      const st = String(o.status || '').toUpperCase();
      if (st === 'PAID' || st === 'COMPLETED') {
        totalSales += Number(o.total_amount ?? 0);
      }
      totalOrders += 1;
      const day = (o.created_at || '').slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, orders: 0, sales: 0 };
      byDay[day].orders += 1;
      if (st === 'PAID' || st === 'COMPLETED') {
        byDay[day].sales += Number(o.total_amount ?? 0);
      }
    }

    const itemsRes = await supabase
      .from(ORDER_ITEMS_TABLE)
      .select('product_id,quantity,order_id')
      .gte('created_at', since);
    if (itemsRes.error && itemsRes.error.code !== '42703') throw itemsRes.error;
    const items = itemsRes.data || [];
    // Filter items for this merchant by joining with orders in-memory using previous rows
    const orderIdSet = new Set(rows.map((o) => o.id));
    const productMap = new Map();
    for (const it of items) {
      if (!orderIdSet.has(it.order_id)) continue;
      const pid = it.product_id;
      const qty = Number(it.quantity) || 0;
      if (!pid || qty <= 0) continue;
      productMap.set(pid, (productMap.get(pid) || 0) + qty);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([product_id, total_quantity]) => ({ product_id, total_quantity }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10);

    return {
      data: {
        totalSales,
        totalOrders,
        salesByDay: Object.values(byDay).sort((a, b) => (a.date < b.date ? -1 : 1)),
        topProducts,
      },
      error: null,
    };
  } catch (err) {
    logger.error('analyticsService getMerchantOverview error', { message: err.message });
    return { data: null, error: err };
  }
}

export { getAdminOverview, getMerchantOverview };

