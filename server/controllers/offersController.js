/**
 * Offers: public list + admin CRUD.
 */

import * as offersService from '../services/offersService.js';
import logger from '../utils/logger.js';

export async function getOffers(req, res) {
  try {
    const { data, error } = await offersService.listActive();
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, offers: data });
  } catch (err) {
    logger.error('offers getOffers', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getOffersAdmin(req, res) {
  try {
    const { data, error } = await offersService.listForAdmin();
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, offers: data });
  } catch (err) {
    logger.error('offers getOffersAdmin', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createOffer(req, res) {
  try {
    const body = req.body || {};
    const { data, error } = await offersService.create(body);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(201).json({ success: true, offer: data });
  } catch (err) {
    logger.error('offers createOffer', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateOffer(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { data, error } = await offersService.update(id, body);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, offer: data });
  } catch (err) {
    logger.error('offers updateOffer', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteOffer(req, res) {
  try {
    const { id } = req.params;
    const { error } = await offersService.remove(id);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('offers deleteOffer', { message: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
}
