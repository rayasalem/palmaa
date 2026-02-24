/**
 * Address controller: cities and villages for checkout dropdowns.
 */

import * as addressService from '../services/addressService.js';

async function getCities(req, res) {
  try {
    const cities = await addressService.getCities();
    return res.status(200).json({ success: true, data: cities });
  } catch (err) {
    console.error('[addressController] getCities:', err);
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
    console.error('[addressController] getVillages:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load villages' });
  }
}

export { getCities, getVillages };
