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
import { createCardPayment as cybersourceCreateCardPayment } from './cybersourceClient.js';
import logger from '../utils/logger.js';

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
    logger.error('paymentService Update error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

const PLACEHOLDER_BANK_HOST = 'sandbox-bank-url.com';

function buildSandboxPaymentUrl(orderId, amount, returnUrl) {
  const baseUrl = process.env.SANDBOX_PAYMENT_URL || `https://${PLACEHOLDER_BANK_HOST}/pay`;
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
  const baseUrl = (process.env.SANDBOX_PAYMENT_URL || '').trim();
  const isPlaceholder = !baseUrl || baseUrl.includes(PLACEHOLDER_BANK_HOST);
  if (isPlaceholder) {
    console.log('[paymentService] No real payment URL configured; returning sandboxSimulation for order:', orderId);
    return { paymentUrl: null, sandboxSimulation: true, orderId, amount, error: null };
  }
  const paymentUrl = buildSandboxPaymentUrl(orderId, amount, returnUrl);
  console.log('[paymentService] Payment URL created for order:', orderId);
  return { paymentUrl, error: null };
}

async function decrementStockForOrder(orderId) {
  const { data: order } = await orderService.getOrderById(orderId);
  const items = (order && order.items) || [];
  for (const it of items) {
    const productId = it.product_id || it.productId;
    const qty = Number(it.quantity) || 1;
    if (productId) {
      const { error } = await productService.decrementStock(productId, qty);
      if (error) {
        logger.error('paymentService decrementStock failed', { productId, message: error.message });
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
      logger.error('paymentService recordProfitsForOrder error', { message: profitErr.message });
    }
    const { data: order } = await orderService.getOrderById(orderId);
    const totalAmount = (order && order.total_amount != null) ? order.total_amount : 0;
    const paymentMethod = ((order && order.payment_method) || 'online').toLowerCase();
    const isCash = paymentMethod === 'cod' || paymentMethod === 'cash';
    const { error: txErr } = await transactionService.recordOrderSettlement(
      orderId,
      totalAmount,
      isCash ? 'cash' : 'online',
      !!(order && order.invoice_uploaded)
    );
    if (txErr) logger.error('paymentService recordOrderSettlement error', { message: txErr.message });
  }
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, { result, at: Date.now() });
  }
  return result;
}

/**
 * Process a card payment via Cybersource Sandbox/REST.
 * - Validates order and amount
 * - Sends card data to Cybersource (never stored in DB)
 * - On AUTHORIZED: reuses handlePaymentCallback to update order & settlements
 * - Records a PAYMENT row in transactions table for all attempts
 */
async function processCybersourceCardPayment(orderId, amount, currency, card) {
  const numAmount = Number(amount);
  if (Number.isNaN(numAmount) || numAmount <= 0) {
    return { success: false, decision: 'ERROR', error: new Error('amount must be a positive number') };
  }

  // Make sure order exists and is not already paid
  const { data: order, error: orderErr } = await orderService.getOrderById(orderId);
  if (orderErr || !order) {
    return { success: false, decision: 'ERROR', error: orderErr || new Error('Order not found') };
  }
  const currentStatus = String(order.status || '').toUpperCase();
  if (currentStatus === 'PAID' || currentStatus === 'COMPLETED') {
    return { success: false, decision: 'ERROR', error: new Error('Order already paid') };
  }

  let decision = 'ERROR';
  let transactionId = null;

  try {
    const { decision: dec, transactionId: txId } = await cybersourceCreateCardPayment({
      orderId,
      amount: numAmount,
      currency,
      card: {
        number: card.number,
        expMonth: card.expMonth,
        expYear: card.expYear,
        cvv: card.cvv,
      },
    });
    decision = dec;
    transactionId = txId;
  } catch (err) {
    logger.error('paymentService Cybersource error', { message: err.message });
    decision = 'ERROR';
  }

  const upperDecision = String(decision).toUpperCase();

  // Record payment attempt regardless of outcome
  await transactionService.recordPaymentAttempt(
    orderId,
    numAmount,
    currency,
    upperDecision === 'AUTHORIZED' ? 'COMPLETED' : 'FAILED',
    transactionId,
    'online'
  );

  if (upperDecision === 'AUTHORIZED') {
    // الدفع بالبطاقة = إلكتروني: حدّث الطلب لاحتساب العمولة والغرامة الضريبية (16% عند عدم رفع الفاتورة)
    await supabase.from(ORDERS_TABLE).update({ payment_method: 'online', updated_at: new Date().toISOString() }).eq('id', orderId);
    // Reuse existing callback logic (idempotent) to update order status, stock, profits, settlement
    const idempotencyKey = transactionId ? `cybersource:${transactionId}` : undefined;
    const { error } = await handlePaymentCallback(orderId, 'success', idempotencyKey);
    if (error) {
      return { success: false, decision: 'ERROR', transactionId, error };
    }
    return { success: true, decision: upperDecision, transactionId, error: null };
  }

  if (upperDecision === 'DECLINE') {
    return {
      success: false,
      decision: upperDecision,
      transactionId,
      error: new Error('Payment was declined by issuer'),
    };
  }

  return {
    success: false,
    decision: upperDecision,
    transactionId,
    error: new Error('Payment failed'),
  };
}

export {
  updateOrderStatus,
  buildSandboxPaymentUrl,
  createPayment,
  handlePaymentCallback,
  ORDERS_TABLE,
  processCybersourceCardPayment,
};
