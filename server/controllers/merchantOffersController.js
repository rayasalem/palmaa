/**
 * Merchant offers: التاجر يدير عروضه (خصم على منتج / تصنيف / الكل + مدة).
 */

import * as merchantOffersService from '../services/merchantOffersService.js';
import logger from '../utils/logger.js';

export async function list(req, res) {
  try {
    const merchantId = req.auth?.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { data, error } = await merchantOffersService.listByMerchant(merchantId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, offers: data });
  } catch (err) {
    logger.error('merchantOffersController list', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function create(req, res) {
  try {
    const merchantId = req.auth?.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const body = req.body || {};
    const { data, error } = await merchantOffersService.create(merchantId, body);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, offer: data });
  } catch (err) {
    logger.error('merchantOffersController create', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function update(req, res) {
  try {
    const merchantId = req.auth?.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { id } = req.params;
    const body = req.body || {};
    const { data, error } = await merchantOffersService.update(id, merchantId, body);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, offer: data });
  } catch (err) {
    logger.error('merchantOffersController update', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function remove(req, res) {
  try {
    const merchantId = req.auth?.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { id } = req.params;
    const { error } = await merchantOffersService.remove(id, merchantId);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('merchantOffersController remove', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}
