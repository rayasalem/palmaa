/**
 * Cart controller: GET/POST/PATCH/DELETE for /api/cart.
 * All routes require authenticate middleware (req.auth.sub = user id).
 * Multi-user: each user's cart is isolated by user_id.
 */

import * as cartService from '../services/cartService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/cart – return current user's cart with items (and optional product snapshot).
 */
async function getCart(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { data, error } = await cartService.getCartWithItems(userId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to get cart' });
    }
    return res.status(200).json({ success: true, cart: data });
  } catch (err) {
    logger.error('getCart unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * POST /api/cart/items – body: { product_id or productId, quantity }. Add or merge item; price from products table.
 */
async function addItem(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const body = req.body || {};
    const product_id = (body.product_id ?? body.productId ?? '').toString().trim();
    const quantity = body.quantity != null ? Number(body.quantity) : 1;
    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }
    const { data, error } = await cartService.addItem(userId, product_id, quantity);
    if (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({ success: false, error: error.message || 'Failed to add item' });
    }
    return res.status(200).json({ success: true, cart: data });
  } catch (err) {
    logger.error('addCartItem unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * PATCH /api/cart/items/:productId – body: { quantity }. Update quantity; remove if quantity <= 0.
 */
async function updateItem(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { productId } = req.params;
    const { quantity } = req.body || {};
    const { data, error } = await cartService.updateItem(userId, productId, quantity);
    if (error) {
      if (error.message === 'Item not in cart') {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({ success: false, error: error.message || 'Failed to update item' });
    }
    return res.status(200).json({ success: true, cart: data });
  } catch (err) {
    logger.error('updateCartItem unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * DELETE /api/cart/items/:productId – remove item from cart.
 */
async function removeItem(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { productId } = req.params;
    const { data, error } = await cartService.removeItem(userId, productId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to remove item' });
    }
    return res.status(200).json({ success: true, cart: data });
  } catch (err) {
    logger.error('removeCartItem unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * DELETE /api/cart – clear all items in user's cart.
 */
async function clearCart(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { data, error } = await cartService.clearCart(userId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to clear cart' });
    }
    return res.status(200).json({ success: true, cart: data });
  } catch (err) {
    logger.error('clearCart unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { getCart, addItem, updateItem, removeItem, clearCart };
