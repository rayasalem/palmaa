/**
 * Broker controller: shared products CRUD (persist to Supabase).
 */

import * as sharedProductsService from '../services/sharedProductsService.js';
import { canUseBrokerFeatures } from '../services/subscriptionService.js';
import logger from '../utils/logger.js';

async function upsertSharedProduct(req, res) {
  try {
    const brokerId = req.auth && req.auth.sub;
    if (!brokerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if ((req.auth && req.auth.role && String(req.auth.role).toUpperCase()) !== 'BROKER') {
      return res.status(403).json({ success: false, error: 'Only brokers can share products' });
    }
    const { allowed, reason } = await canUseBrokerFeatures(brokerId);
    if (!allowed) {
      const msg =
        reason === 'BROKER_SUBSCRIPTION_EXPIRED'
          ? 'Your broker subscription has expired. Please contact support to renew your plan.'
          : 'Broker features are not available for this account.';
      return res.status(403).json({ success: false, error: msg, reason });
    }
    const { productId } = req.params;
    const body = req.body || {};
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });

    const { data, error } = await sharedProductsService.upsert(brokerId, productId, {
      marketing_title: body.marketing_title,
      marketing_description: body.marketing_description,
      custom_discount_text: body.custom_discount_text,
      is_featured: body.is_featured,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, shared: data });
  } catch (err) {
    logger.error('upsertSharedProduct', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function listSharedProducts(req, res) {
  try {
    const brokerId = req.auth && req.auth.sub;
    if (!brokerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { data, error } = await sharedProductsService.listByBrokerId(brokerId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, shared: data });
  } catch (err) {
    logger.error('listSharedProducts', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function removeSharedProduct(req, res) {
  try {
    const brokerId = req.auth && req.auth.sub;
    if (!brokerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });
    const { error } = await sharedProductsService.remove(brokerId, productId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('removeSharedProduct', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function toggleFeatured(req, res) {
  try {
    const brokerId = req.auth && req.auth.sub;
    if (!brokerId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { allowed, reason } = await canUseBrokerFeatures(brokerId);
    if (!allowed) {
      const msg =
        reason === 'BROKER_SUBSCRIPTION_EXPIRED'
          ? 'Your broker subscription has expired. Please contact support to renew your plan.'
          : 'Broker features are not available for this account.';
      return res.status(403).json({ success: false, error: msg, reason });
    }
    const { shareId } = req.params;
    if (!shareId) return res.status(400).json({ success: false, error: 'shareId is required' });
    const { data, error } = await sharedProductsService.toggleFeatured(brokerId, shareId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, shared: data });
  } catch (err) {
    logger.error('toggleFeatured', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { upsertSharedProduct, listSharedProducts, removeSharedProduct, toggleFeatured };
