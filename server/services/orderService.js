/**
 * Order service: create order (and optional order_items), get order by id (Supabase).
 */

import { supabase } from '../config/supabaseClient.js';
import * as productService from './productService.js';

const ORDERS_TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';

async function createOrder(params) {
  const { recipient_name, address, city, phone, amount, weight, customer_id, broker_id, items, payment_method } = params;
  const now = new Date().toISOString();
  let merchant_id = null;
  if (items && Array.isArray(items) && items.length > 0) {
    const firstProductId = items[0].product_id || items[0].productId;
    if (firstProductId) {
      const { data: product } = await productService.getProductById(firstProductId);
      if (product?.merchant_id) merchant_id = product.merchant_id;
    }
  }
  const orderRow = {
    status: 'PENDING',
    total_amount: Number(amount),
    shipping_name: recipient_name || null,
    shipping_phone: phone || null,
    shipping_address: address || null,
    payment_method: payment_method || 'COD',
    created_at: now,
  };
  if (customer_id) orderRow.customer_id = customer_id;
  if (broker_id) orderRow.broker_id = broker_id;
  if (merchant_id) orderRow.merchant_id = merchant_id;

  const { data: order, error } = await supabase
    .from(ORDERS_TABLE)
    .insert(orderRow)
    .select()
    .single();

  if (error) {
    console.error('[orderService] Insert error:', error.message);
    return { data: null, error };
  }

  if (items && Array.isArray(items) && items.length > 0) {
    const rows = items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id || it.productId,
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
    }));
    const { error: itemsError } = await supabase.from(ORDER_ITEMS_TABLE).insert(rows);
    if (itemsError) {
      console.error('[orderService] order_items insert error:', itemsError.message);
      return { data: order, error: itemsError };
    }
  }
  return { data: order, error: null };
}

async function getOrderById(orderId) {
  const { data: order, error } = await supabase
    .from(ORDERS_TABLE)
    .select('*')
    .eq('id', orderId)
    .single();
  if (error || !order) {
    return { data: null, error: error || { message: 'Order not found' } };
  }
  const { data: orderItems } = await supabase
    .from(ORDER_ITEMS_TABLE)
    .select('*')
    .eq('order_id', orderId);
  return { data: { ...order, items: orderItems || [] }, error: null };
}

async function getOrdersByCustomerId(customerId) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .select('*, order_items(*)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[orderService] getOrdersByCustomerId error:', error.message);
    return { data: [], error };
  }
  return { data: data || [], error: null };
}

async function cancelOrder(orderId, customerId) {
  const { data: order, error: fetchErr } = await supabase
    .from(ORDERS_TABLE)
    .select('id, customer_id, status, delivery_id')
    .eq('id', orderId)
    .single();
  if (fetchErr || !order) {
    return { data: null, error: fetchErr || { message: 'Order not found' } };
  }
  if (order.customer_id !== customerId) {
    return { data: null, error: { message: 'Not authorized to cancel this order' } };
  }
  if (order.status !== 'PENDING' && order.status !== 'pending') {
    return { data: null, error: { message: 'Only pending orders can be cancelled' } };
  }
  const { data: updated, error: updateErr } = await supabase
    .from(ORDERS_TABLE)
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();
  if (updateErr) return { data: null, error: updateErr };
  return { data: updated, error: null };
}

async function updateOrderInvoice(orderId, invoiceUrl) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update({
      invoice_uploaded: true,
      invoice_file_url: invoiceUrl,
      invoice_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();
  if (error) {
    console.error('[orderService] updateOrderInvoice error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

async function completeOrder(orderId) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();
  if (error) {
    console.error('[orderService] completeOrder error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

export { createOrder, getOrderById, getOrdersByCustomerId, cancelOrder, updateOrderInvoice, completeOrder, ORDERS_TABLE, ORDER_ITEMS_TABLE };
