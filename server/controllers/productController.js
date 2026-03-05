/**
 * Product controller: list, get, create, update, delete.
 * Write operations require auth and MERCHANT role; owner-only for update/delete.
 */

import * as productService from '../services/productService.js';
import * as notificationService from '../services/notificationService.js';
import * as subscriptionService from '../services/subscriptionService.js';
import logger from '../utils/logger.js';

async function list(req, res) {
  try {
    const { data, error } = await productService.getActiveProducts();
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch products' });
    }
    return res.status(200).json({ success: true, products: data });
  } catch (err) {
    logger.error('product list unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { data, error } = await productService.getProductById(id);
    if (error) return res.status(404).json({ success: false, error: error.message || 'Product not found' });
    return res.status(200).json({ success: true, product: data });
  } catch (err) {
    logger.error('product getById unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function listByMerchant(req, res) {
  try {
    const { merchantId } = req.params;
    if (!merchantId) return res.status(400).json({ success: false, error: 'Merchant id is required' });
    const { data, error } = await productService.getProductsByMerchantId(merchantId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch products' });
    }
    return res.status(200).json({ success: true, products: data });
  } catch (err) {
    logger.error('product listByMerchant unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const merchantId = req.auth && req.auth.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { allowed, reason } = await subscriptionService.canAddProducts(merchantId);
    if (!allowed) {
      const msg = reason === 'MERCHANT_SUSPENDED'
        ? 'Your store has been suspended. Contact support.'
        : 'Subscription expired. Please renew to add new products.';
      return res.status(403).json({ success: false, error: msg, code: reason });
    }
    const body = req.body || {};
    const name = body.name ?? body.title;
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const numPrice = Number(body.price ?? body.price_ils);
    if (Number.isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, error: 'price must be a non-negative number' });
    }
    const { data, error } = await productService.createProduct(merchantId, {
      name: String(name).trim(),
      description: body.description,
      price: numPrice,
      price_ils: numPrice,
      stock: body.stock,
      category: body.category,
      isActive: body.isActive,
      images: body.images,
      image_url: body.image_url,
      is_bestseller: body.is_bestseller,
      sku: body.sku,
      weight: body.weight,
      dimensions: body.dimensions,
      tags: body.tags,
      condition: body.condition,
    });
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to create product' });
    }
    await notificationService.notifyFollowersNewProduct(merchantId, data.id);
    return res.status(201).json({ success: true, product: data });
  } catch (err) {
    logger.error('product create unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const merchantId = req.auth && req.auth.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Product id is required' });
    const body = req.body || {};
    const { data, error } = await productService.updateProduct(id, merchantId, {
      name: body.name ?? body.title,
      description: body.description,
      price: body.price ?? body.price_ils,
      stock: body.stock,
      category: body.category,
      isActive: body.isActive,
      images: body.images,
      image_url: body.image_url,
      sku: body.sku,
      weight: body.weight,
      dimensions: body.dimensions,
      tags: body.tags,
    condition: body.condition,
    });
    if (error) {
      return res.status((error.message && error.message.includes('0 rows')) ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to update product',
      });
    }
    return res.status(200).json({ success: true, product: data });
  } catch (err) {
    logger.error('product update unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const merchantId = req.auth && req.auth.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { error } = await productService.deleteProduct(id, merchantId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to delete product' });
    }
    return res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    logger.error('product remove unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { list, getById, listByMerchant, create, update, remove };
