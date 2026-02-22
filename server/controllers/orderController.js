/**
 * Order controller: create order, get order by id. Validates body and uses try/catch.
 * Optional: req.auth (JWT) for customer_id; body.items for order line items.
 */

import * as orderService from '../services/orderService.js';

async function createOrder(req, res) {
  try {
    const { recipient_name, address, city, phone, amount, weight, items } = req.body || {};
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

    const customer_id = req.auth?.sub || null;

    const { data, error } = await orderService.createOrder({
      recipient_name,
      address,
      city,
      phone,
      amount: numAmount,
      weight: numWeight,
      customer_id,
      items: Array.isArray(items) ? items : undefined,
    });
    if (error) {
      console.error('[orderController] createOrder error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to create order' });
    }
    return res.status(201).json({ success: true, order: data });
  } catch (err) {
    console.error('[orderController] createOrder unexpected:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getOrder(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Order id is required' });
    const { data, error } = await orderService.getOrderById(id);
    if (error) return res.status(404).json({ success: false, error: error.message || 'Order not found' });
    return res.status(200).json({ success: true, order: data });
  } catch (err) {
    console.error('[orderController] getOrder unexpected:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function listMyOrders(req, res) {
  try {
    const customerId = req.auth?.sub;
    if (!customerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { data, error } = await orderService.getOrdersByCustomerId(customerId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch orders' });
    }
    return res.status(200).json({ success: true, orders: data });
  } catch (err) {
    console.error('[orderController] listMyOrders unexpected:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function cancelOrder(req, res) {
  try {
    const customerId = req.auth?.sub;
    if (!customerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Order id is required' });
    const { data, error } = await orderService.cancelOrder(id, customerId);
    if (error) {
      const status = error.message?.includes('Not authorized') ? 403 : error.message?.includes('Only pending') ? 400 : 404;
      return res.status(status).json({ success: false, error: error.message || 'Failed to cancel order' });
    }
    return res.status(200).json({ success: true, order: data });
  } catch (err) {
    console.error('[orderController] cancelOrder unexpected:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { createOrder, getOrder, listMyOrders, cancelOrder };
