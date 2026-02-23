/**
 * Transaction service: record order settlement (commission 15%, tax penalty 16% if online and no invoice).
 */

import { supabase } from '../config/supabaseClient.js';
import * as orderService from './orderService.js';
import * as productService from './productService.js';

const TRANSACTIONS_TABLE = 'transactions';

const COMMISSION_RATE = 0.15;   // 15%
const TAX_PENALTY_RATE = 0.16;  // 16% when payment is online and no invoice

/**
 * Derive merchant_id from order (first item's product merchant).
 */
async function getOrderMerchantId(orderId) {
  const { data: order, error } = await orderService.getOrderById(orderId);
  if (error || !order?.items?.length) return { merchantId: null, error };
  const first = order.items[0];
  const productId = first.product_id || first.productId;
  if (!productId) return { merchantId: null, error: null };
  const { data: product } = await productService.getProductById(productId);
  return { merchantId: product?.merchant_id ?? null, error: null };
}

/**
 * Record order settlement transaction: commission, optional tax penalty, merchant_net.
 * Call when order is paid (payment callback).
 * @param {string} orderId
 * @param {number} totalAmount - order total
 * @param {string} paymentMethod - 'online' | 'cash'
 * @param {boolean} invoiceUploaded - tax invoice uploaded for this order
 */
async function recordOrderSettlement(orderId, totalAmount, paymentMethod, invoiceUploaded) {
  const { merchantId } = await getOrderMerchantId(orderId);
  const total = Number(totalAmount) || 0;
  const commissionAmount = Math.round(total * COMMISSION_RATE * 100) / 100;
  const isOnline = String(paymentMethod).toLowerCase() === 'online';
  const applyTaxPenalty = isOnline && !invoiceUploaded;
  const taxPenaltyAmount = applyTaxPenalty ? Math.round(total * TAX_PENALTY_RATE * 100) / 100 : 0;
  const merchantNetAmount = Math.round((total - commissionAmount - taxPenaltyAmount) * 100) / 100;

  const { data: existing } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select('id')
    .eq('order_id', orderId)
    .eq('type', 'order_settlement')
    .limit(1);
  if (existing && existing.length > 0) {
    console.log('[transactionService] Settlement already recorded for order:', orderId);
    return { data: existing[0], error: null };
  }

  const row = {
    order_id: orderId,
    merchant_id: merchantId,
    amount: total,
    total_amount: total,
    commission_amount: commissionAmount,
    tax_penalty_amount: taxPenaltyAmount,
    merchant_net_amount: merchantNetAmount,
    payment_method: isOnline ? 'online' : 'cash',
    invoice_uploaded: !!invoiceUploaded,
    type: 'order_settlement',
    status: 'COMPLETED',
  };

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('[transactionService] recordOrderSettlement error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Get transaction stats for a merchant (for dashboard).
 */
async function getMerchantStats(merchantId) {
  const { data: rows, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select('total_amount, commission_amount, tax_penalty_amount, merchant_net_amount, order_id, created_at')
    .eq('merchant_id', merchantId)
    .eq('type', 'order_settlement')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[transactionService] getMerchantStats error:', error.message);
    return { data: null, error };
  }
  const list = rows || [];
  const total_sales = list.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const total_commission = list.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
  const total_tax_penalty = list.reduce((s, r) => s + Number(r.tax_penalty_amount || 0), 0);
  const net_profit = list.reduce((s, r) => s + Number(r.merchant_net_amount || 0), 0);
  return {
    data: {
      total_sales: Math.round(total_sales * 100) / 100,
      total_commission: Math.round(total_commission * 100) / 100,
      total_tax_penalty: Math.round(total_tax_penalty * 100) / 100,
      net_profit: Math.round(net_profit * 100) / 100,
      transactions: list,
    },
    error: null,
  };
}

export {
  recordOrderSettlement,
  getMerchantStats,
  getOrderMerchantId,
  COMMISSION_RATE,
  TAX_PENALTY_RATE,
};
