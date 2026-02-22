/**
 * Admin controller: users list, update user status, orders list.
 * All routes require ADMIN role.
 */

import * as adminService from '../services/adminService.js';
import logger from '../utils/logger.js';

async function getUsers(req, res) {
  try {
    const { data, error } = await adminService.listUsers();
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

async function getOrders(req, res) {
  try {
    const { data, error } = await adminService.listOrders();
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
    const { data, error } = await adminService.listProducts();
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
    return res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    logger.error('admin deleteProduct unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { getUsers, updateUserStatus, getOrders, getProducts, updateProduct, deleteProduct };
