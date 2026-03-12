/**
 * Profit service: حساب وتسجيل أرباح التاجر، المتجر، والوسيط عند إتمام بيع.
 * - بيع من التاجر مباشرة: التاجر 85%، المتجر 15%.
 * - بيع عبر الوسيط: التاجر 85%، المتجر 12%، الوسيط 3%.
 */

import { supabase } from '../config/supabaseClient.js';
import * as orderService from './orderService.js';
import * as productService from './productService.js';
import logger from '../utils/logger.js';

const ORDER_PROFITS_TABLE = 'order_profits';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(s) {
  return typeof s === 'string' && s.trim() && UUID_REGEX.test(s.trim());
}

const STORE_RATE = 0.15; // 15% للمتجر عند البيع المباشر
const STORE_RATE_WITH_BROKER = 0.12; // 12% للمتجر عند البيع عبر الوسيط
const BROKER_RATE = 0.03; // 3% للوسيط من قيمة القطعة
const MERCHANT_RATE = 0.85; // 85% للتاجر (100% - 15%)

/**
 * Record profits for a paid order: merchant, store, and optionally broker.
 * Called once when order status becomes 'paid'.
 * @param {string} orderId - Order UUID
 * @returns {{ error: Error | null }}
 */
async function recordProfitsForOrder(orderId) {
  const { data: order, error: orderErr } = await orderService.getOrderById(orderId);
  if (orderErr || !order) {
    logger.error('profitService getOrderById error', { message: (orderErr && orderErr.message) || 'Order not found' });
    return { error: orderErr || new Error('Order not found') };
  }

  const items = order.items || [];
  if (items.length === 0) {
    console.log('[profitService] Order has no items, skip profit recording:', orderId);
    return { error: null };
  }

  const brokerId = order.broker_id || null;
  const hasBroker = !!brokerId;
  const storeRate = hasBroker ? STORE_RATE_WITH_BROKER : STORE_RATE;

  const { data: existing } = await supabase.from(ORDER_PROFITS_TABLE).select('id').eq('order_id', orderId).limit(1);
  if (existing && existing.length > 0) {
    console.log('[profitService] Profits already recorded for order:', orderId);
    return { error: null };
  }

  const rowsToInsert = [];

  for (const item of items) {
    const productId = item.product_id || item.productId;
    if (!productId) continue;

    const { data: product } = await productService.getProductById(productId);
    const merchantId = (product && product.merchant_id) || null;
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    const itemTotal = price * quantity;

    if (itemTotal <= 0) continue;

    const merchantAmount = Math.round(MERCHANT_RATE * itemTotal * 100) / 100;
    const storeAmount = Math.round(storeRate * itemTotal * 100) / 100;
    const brokerAmount = hasBroker ? Math.round(BROKER_RATE * itemTotal * 100) / 100 : 0;

    const rawItemId = item.id || null;
    const orderItemId = rawItemId && isValidUuid(String(rawItemId)) ? rawItemId : null;

    if (merchantId != null && merchantAmount > 0) {
      rowsToInsert.push({
        order_id: orderId,
        order_item_id: orderItemId,
        party_type: 'merchant',
        party_id: merchantId,
        amount_ils: merchantAmount,
      });
    }
    if (storeAmount > 0) {
      rowsToInsert.push({
        order_id: orderId,
        order_item_id: orderItemId,
        party_type: 'store',
        party_id: null,
        amount_ils: storeAmount,
      });
    }
    if (hasBroker && brokerId && brokerAmount > 0) {
      rowsToInsert.push({
        order_id: orderId,
        order_item_id: orderItemId,
        party_type: 'broker',
        party_id: brokerId,
        amount_ils: brokerAmount,
      });
    }
  }

  if (rowsToInsert.length === 0) {
    console.log('[profitService] No profit rows to insert for order:', orderId);
    return { error: null };
  }

  const { error: insertErr } = await supabase.from(ORDER_PROFITS_TABLE).insert(rowsToInsert);

  if (insertErr) {
    logger.error('profitService Insert error', { message: insertErr.message });
    return { error: insertErr };
  }

  console.log('[profitService] Recorded', rowsToInsert.length, 'profit rows for order', orderId);
  return { error: null };
}

/**
 * Get total profits by party (for dashboard/reports).
 * @param {string} partyType - 'merchant' | 'store' | 'broker'
 * @param {string} [partyId] - user id for merchant/broker; omit for store total
 */
async function getProfitsByParty(partyType, partyId = null) {
  let q = supabase.from(ORDER_PROFITS_TABLE).select('order_id, amount_ils, created_at').eq('party_type', partyType);

  if (partyId != null) {
    q = q.eq('party_id', partyId);
  } else if (partyType === 'store') {
    q = q.is('party_id', null);
  }

  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) {
    logger.error('profitService getProfitsByParty error', { message: error.message });
    return { data: [], error };
  }

  const total = (data || []).reduce((sum, row) => sum + Number(row.amount_ils || 0), 0);
  return { data: data || [], total, error: null };
}

export {
  recordProfitsForOrder,
  getProfitsByParty,
  ORDER_PROFITS_TABLE,
  STORE_RATE,
  STORE_RATE_WITH_BROKER,
  BROKER_RATE,
  MERCHANT_RATE,
};
