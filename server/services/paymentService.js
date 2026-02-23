/**
 * Payment service: order status updates and sandbox payment URL.
 * Idempotency: duplicate callback with same key returns same result.
 * On paid: decrements product stock for each order item.
 */

import { supabase } from '../config/supabaseClient.js';
import * as orderService from './orderService.js';
import * as productService from './productService.js';
import * as profitService from './profitService.js';
import * as transactionService from './transactionService.js';

const ORDERS_TABLE = 'orders';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const idempotencyCache = new Map();

function pruneIdempotency() {
  const now = Date.now();
  for (const [k, v] of idempotencyCache.entries()) {
    if (now - v.at > IDEMPOTENCY_TTL_MS) idempotencyCache.delete(k);
  }
}

async function updateOrderStatus(orderId, status) {
  console.log('[paymentService] Updating order', orderId, 'to', status);
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('[paymentService] Update error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

function buildSandboxPaymentUrl(orderId, amount, returnUrl) {
  const baseUrl = process.env.SANDBOX_PAYMENT_URL || 'https://sandbox-bank-url.com/pay';
  const url = new URL(baseUrl);
  url.searchParams.set('orderId', orderId);
  url.searchParams.set('amount', String(amount));
  if (returnUrl) url.searchParams.set('return_url', returnUrl);
  return url.toString();
}

async function createPayment(orderId, amount, returnUrl) {
  const updateResult = await updateOrderStatus(orderId, 'payment_processing');
  if (updateResult.error) return { paymentUrl: null, error: updateResult.error };
  await supabase.from(ORDERS_TABLE).update({ payment_method: 'online', updated_at: new Date().toISOString() }).eq('id', orderId);
  const paymentUrl = buildSandboxPaymentUrl(orderId, amount, returnUrl);
  console.log('[paymentService] Sandbox URL created for order:', orderId);
  return { paymentUrl, error: null };
}

async function decrementStockForOrder(orderId) {
  const { data: order } = await orderService.getOrderById(orderId);
  const items = order?.items || [];
  for (const it of items) {
    const productId = it.product_id || it.productId;
    const qty = Number(it.quantity) || 1;
    if (productId) {
      const { error } = await productService.decrementStock(productId, qty);
      if (error) {
        console.error('[paymentService] decrementStock failed for product', productId, error.message);
      }
    }
  }
}

async function handlePaymentCallback(orderId, status, idempotencyKey) {
  if (idempotencyKey) {
    pruneIdempotency();
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached) return cached.result;
  }
  const normalized = String(status).toLowerCase();
  const newStatus = normalized === 'success' ? 'paid' : 'failed';
  const result = await updateOrderStatus(orderId, newStatus);
  if (!result.error && newStatus === 'paid') {
    await decrementStockForOrder(orderId);
    const { error: profitErr } = await profitService.recordProfitsForOrder(orderId);
    if (profitErr) {
      console.error('[paymentService] recordProfitsForOrder error:', profitErr.message);
    }
    const { data: order } = await orderService.getOrderById(orderId);
    const totalAmount = order?.total_amount ?? 0;
    const paymentMethod = (order?.payment_method || 'online').toLowerCase();
    const isCash = paymentMethod === 'cod' || paymentMethod === 'cash';
    const { error: txErr } = await transactionService.recordOrderSettlement(
      orderId,
      totalAmount,
      isCash ? 'cash' : 'online',
      !!order?.invoice_uploaded
    );
    if (txErr) console.error('[paymentService] recordOrderSettlement error:', txErr.message);
  }
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, { result, at: Date.now() });
  }
  return result;
}

export {
  updateOrderStatus,
  buildSandboxPaymentUrl,
  createPayment,
  handlePaymentCallback,
  ORDERS_TABLE,
};
