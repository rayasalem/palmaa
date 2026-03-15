/**
 * Order controller: create order, get order by id. Validates body and try/catch.
 * GET /api/orders/:id: optionalAuth; access allowed for customer_id, merchant_id, ADMIN, or X-Order-Guest-Token (UUID v4).
 * Response shape unchanged; guest_access_token is never returned.
 */

import * as orderService from '../services/orderService.js';
import logger from '../utils/logger.js';

/** UUID v4 or Cybersource short ref ORD-xxxxxxxx */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_REF_REGEX = /^ORD-[0-9a-f]{8}$/i;
function isUuidV4(s) {
  return typeof s === 'string' && UUID_V4_REGEX.test(s.trim());
}
function isValidOrderId(s) {
  return typeof s === 'string' && (UUID_V4_REGEX.test(s.trim()) || ORDER_REF_REGEX.test(s.trim()));
}

async function createOrder(req, res) {
  try {
    const { recipient_name, address, city, cityId, villageId, phone, amount, weight, items, payment_method } = req.body || {};
    if (recipient_name == null || String(recipient_name).trim() === '') {
      return res.status(400).json({ success: false, error: 'recipient_name is required' });
    }
    if (address == null || String(address).trim() === '') {
      return res.status(400).json({ success: false, error: 'address is required' });
    }
    if (city == null || String(city).trim() === '') {
      return res.status(400).json({ success: false, error: 'city is required' });
    }
    if (phone == null || String(phone).trim() === '') {
      return res.status(400).json({ success: false, error: 'phone is required' });
    }
    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    const numWeight = Number(weight);
    if (Number.isNaN(numWeight) || numWeight <= 0) {
      return res.status(400).json({ success: false, error: 'weight must be a positive number' });
    }

    const customer_id = (req.auth && req.auth.sub) || null;
    const broker_id = (req.body && req.body.broker_id) || (req.body && req.body.brokerId) || null;

    const { data, error } = await orderService.createOrder({
      recipient_name,
      address,
      city,
      cityId: cityId != null ? String(cityId).trim() || undefined : undefined,
      villageId: villageId != null ? String(villageId).trim() || undefined : undefined,
      phone,
      amount: numAmount,
      weight: numWeight,
      customer_id,
      broker_id: broker_id || undefined,
      items: Array.isArray(items) ? items : undefined,
      payment_method: payment_method || 'COD',
    });
    if (error) {
      logger.error('orderController createOrder error', { message: error.message });
      return res.status(500).json({ success: false, error: error.message || 'Failed to create order' });
    }
    return res.status(201).json({ success: true, order: data });
  } catch (err) {
    logger.error('orderController createOrder unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getOrder(req, res) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Order id is required' });
    }
    const orderId = id.trim();
    if (!isValidOrderId(orderId)) {
      return res.status(400).json({ success: false, error: 'Invalid order id format' });
    }
    const guestTokenRaw = req.get && req.get('X-Order-Guest-Token');
    if (guestTokenRaw != null && guestTokenRaw.trim() !== '' && !isUuidV4(guestTokenRaw)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const { data, error } = await orderService.getOrderById(orderId);
    if (error || !data) return res.status(404).json({ success: false, error: 'Order not found' });

    const userId = req.auth && req.auth.sub;
    const role = req.auth && (req.auth.role || '').toUpperCase();
    const isOwner = userId && (userId === data.customer_id || userId === data.merchant_id);
    const isAdmin = role === 'ADMIN';
    const guestToken = guestTokenRaw != null ? String(guestTokenRaw).trim() : '';
    const guestTokenMatch =
      data.guest_access_token &&
      guestToken &&
      String(data.guest_access_token).toLowerCase() === guestToken.toLowerCase();

    if (!isOwner && !isAdmin && !guestTokenMatch) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { guest_access_token: _, ...orderForClient } = data;
    return res.status(200).json({ success: true, order: orderForClient });
  } catch (err) {
    logger.error('orderController getOrder unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function listMyOrders(req, res) {
  try {
    const customerId = req.auth && req.auth.sub;
    if (!customerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;
    const opts = {
      limit: Number.isInteger(limit) ? limit : undefined,
      offset: Number.isInteger(offset) ? offset : undefined,
      cursor_created_at: req.query.cursor_created_at,
      cursor_id: req.query.cursor_id,
    };
    const { data, error, next_cursor_created_at, next_cursor_id } = await orderService.getOrdersByCustomerId(customerId, opts);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch orders' });
    }
    const payload = { success: true, orders: data };
    if (next_cursor_created_at != null) payload.next_cursor_created_at = next_cursor_created_at;
    if (next_cursor_id != null) payload.next_cursor_id = next_cursor_id;
    return res.status(200).json(payload);
  } catch (err) {
    logger.error('orderController listMyOrders unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function listMerchantOrders(req, res) {
  try {
    const merchantId = req.auth && req.auth.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;
    const opts = {
      limit: Number.isInteger(limit) ? limit : undefined,
      offset: Number.isInteger(offset) ? offset : undefined,
      cursor_created_at: req.query.cursor_created_at,
      cursor_id: req.query.cursor_id,
    };
    const { data, error, next_cursor_created_at, next_cursor_id } = await orderService.getOrdersByMerchantId(merchantId, opts);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch orders' });
    }
    const payload = { success: true, orders: data };
    if (next_cursor_created_at != null) payload.next_cursor_created_at = next_cursor_created_at;
    if (next_cursor_id != null) payload.next_cursor_id = next_cursor_id;
    return res.status(200).json(payload);
  } catch (err) {
    logger.error('orderController listMerchantOrders unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function cancelOrder(req, res) {
  try {
    const customerId = req.auth && req.auth.sub;
    if (!customerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Order id is required' });
    const { data, error } = await orderService.cancelOrder(id, customerId);
    if (error) {
      const em = error.message || '';
      const status = em.includes('Not authorized') ? 403 : em.includes('Only pending') ? 400 : 404;
      return res.status(status).json({ success: false, error: error.message || 'Failed to cancel order' });
    }
    return res.status(200).json({ success: true, order: data });
  } catch (err) {
    logger.error('orderController cancelOrder unexpected:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function updateOrderInvoice(req, res) {
  try {
    const orderId = req.params.id;
    const { invoiceUrl } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, error: 'Order id is required' });
    if (!invoiceUrl || String(invoiceUrl).trim() === '') {
      return res.status(400).json({ success: false, error: 'invoiceUrl is required' });
    }
    const { data: order, error: fetchErr } = await orderService.getOrderById(orderId);
    if (fetchErr || !order) return res.status(404).json({ success: false, error: 'Order not found' });
    const merchantId = req.auth && req.auth.sub;
    const isAdmin = req.auth && req.auth.role === 'ADMIN';
    if (order.merchant_id !== merchantId && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this order invoice' });
    }
    const { data: updated, error } = await orderService.updateOrderInvoice(orderId, invoiceUrl.trim());
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, order: updated });
  } catch (err) {
    logger.error('orderController updateOrderInvoice unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function completeOrder(req, res) {
  try {
    const orderId = req.params.id;
    if (!orderId) return res.status(400).json({ success: false, error: 'Order id is required' });
    const { data, error } = await orderService.completeOrder(orderId);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, order: data });
  } catch (err) {
    logger.error('orderController completeOrder unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function claimOrder(req, res) {
  try {
    const orderId = (req.params.id || '').trim();
    const customerId = req.auth && req.auth.sub;
    if (!customerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!orderId) return res.status(400).json({ success: false, error: 'Order id is required' });
    if (!isValidOrderId(orderId)) {
      return res.status(400).json({ success: false, error: 'Invalid order id format' });
    }
    const { data, error } = await orderService.claimOrder(orderId, customerId);
    if (error) {
      const status = error.message === 'Order not found' ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, order: data });
  } catch (err) {
    logger.error('orderController claimOrder unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { createOrder, getOrder, listMyOrders, listMerchantOrders, cancelOrder, updateOrderInvoice, completeOrder, claimOrder };
