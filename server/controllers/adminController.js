/**
 * Admin controller: users list, update user status, orders list, platform settings & earnings.
 * All routes require ADMIN role.
 */

import * as adminService from '../services/adminService.js';
import * as platformSettings from '../services/platformSettingsService.js';
import { invalidateProductsCache } from '../middlewares/cacheMiddleware.js';
import logger from '../utils/logger.js';

async function getUsers(req, res) {
  try {
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;
    const opts = [limit, offset].some((n) => Number.isInteger(n) && n >= 0) ? { limit: limit || 100, offset: offset || 0 } : {};
    const { data, error } = await adminService.listUsers(opts);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch users' });
    }
    return res.status(200).json({ success: true, users: data });
  } catch (err) {
    logger.error('admin getUsers unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'User id is required' });
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    const { data, error } = await adminService.updateUserStatus(id, status);
    if (error) {
      return res.status(400).json({ success: false, error: error.message || 'Failed to update status' });
    }
    return res.status(200).json({ success: true, user: data });
  } catch (err) {
    logger.error('admin updateUserStatus unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function softDeleteUser(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'User id is required' });
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Deletion reason is required' });
    }
    const { data, error } = await adminService.softDeleteUser(id, reason.trim());
    if (error) {
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete user' });
    }
    return res.status(200).json({ success: true, user: data });
  } catch (err) {
    logger.error('admin softDeleteUser unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function restoreUser(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'User id is required' });
    const { data, error } = await adminService.restoreUser(id);
    if (error) {
      return res.status(400).json({ success: false, error: error.message || 'Failed to restore user' });
    }
    return res.status(200).json({ success: true, user: data });
  } catch (err) {
    logger.error('admin restoreUser unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getOrders(req, res) {
  try {
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;
    const opts = [limit, offset].some((n) => Number.isInteger(n) && n >= 0) ? { limit: limit ?? 500, offset: offset ?? 0 } : {};
    const { data, error } = await adminService.listOrders(opts);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch orders' });
    }
    return res.status(200).json({ success: true, orders: data });
  } catch (err) {
    logger.error('admin getOrders unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getProducts(req, res) {
  try {
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : undefined;
    const opts = [limit, offset].some((n) => Number.isInteger(n) && n >= 0) ? { limit: limit || 100, offset: offset || 0 } : {};
    const { data, error } = await adminService.listProducts(opts);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch products' });
    }
    return res.status(200).json({ success: true, products: data });
  } catch (err) {
    logger.error('admin getProducts unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { data, error } = await adminService.adminUpdateProduct(id, {
      name: body.name ?? body.title,
      description: body.description,
      price: body.price ?? body.price_ils,
      stock: body.stock,
      category: body.category,
      isActive: body.isActive,
      images: body.images,
    });
    if (error) {
      return res.status(400).json({ success: false, error: error.message || 'Failed to update product' });
    }
    return res.status(200).json({ success: true, product: data });
  } catch (err) {
    logger.error('admin updateProduct unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Product id is required' });
    const { error } = await adminService.adminDeleteProduct(id);
    if (error) {
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete product' });
    }
    await invalidateProductsCache();
    return res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    logger.error('admin deleteProduct unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getSettings(req, res) {
  try {
    const { commission_rate, tax_penalty_rate, error } = await platformSettings.getRates();
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch settings' });
    }
    return res.status(200).json({
      success: true,
      settings: { commission_rate, tax_penalty_rate },
    });
  } catch (err) {
    logger.error('admin getSettings unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function updateSettings(req, res) {
  try {
    const body = req.body || {};
    const { data, error } = await platformSettings.updateSettings(body);
    if (error) {
      return res.status(400).json({ success: false, error: error.message || 'Failed to update settings' });
    }
    return res.status(200).json({
      success: true,
      settings: {
        commission_rate: data.commission_rate,
        tax_penalty_rate: data.tax_penalty_rate,
      },
    });
  } catch (err) {
    logger.error('admin updateSettings unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function getPlatformEarnings(req, res) {
  try {
    const { data, error } = await adminService.getPlatformEarnings();
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch earnings' });
    }
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    logger.error('admin getPlatformEarnings unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export {
  getUsers,
  updateUserStatus,
  softDeleteUser,
  restoreUser,
  getOrders,
  getProducts,
  updateProduct,
  deleteProduct,
  getSettings,
  updateSettings,
  getPlatformEarnings,
};
