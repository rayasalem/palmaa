/**
 * Address controller: cities and villages for checkout dropdowns.
 */

import * as addressService from '../services/addressService.js';
import logger from '../utils/logger.js';

async function getCities(req, res) {
  try {
    const cities = await addressService.getCities();
    return res.status(200).json({ success: true, data: cities });
  } catch (err) {
    logger.error('addressController getCities', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Failed to load cities' });
  }
}

async function getVillages(req, res) {
  try {
    const search = req.query.search;
    const cityId = req.query.cityId != null ? String(req.query.cityId).trim() : undefined;
    const villages = await addressService.getVillages(search, cityId);
    const list = Array.isArray(villages) ? villages : [];
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    logger.error('addressController getVillages', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Failed to load villages' });
  }
}

async function getDistrictsAndVillages(req, res) {
  try {
    const { districts, villages } = await addressService.getDistrictsAndVillages();
    return res.status(200).json({
      success: true,
      data: {
        districts: Array.isArray(districts) ? districts : [],
        villages: Array.isArray(villages) ? villages : [],
      },
    });
  } catch (err) {
    logger.error('addressController getDistrictsAndVillages', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Failed to load districts and villages' });
  }
}

export { getCities, getVillages, getDistrictsAndVillages };
