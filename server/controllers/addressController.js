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
    const cityId = req.query.cityId;
    const villages = await addressService.getVillages(search, cityId);
    return res.status(200).json({ success: true, data: villages });
  } catch (err) {
    console.error('[addressController] getVillages:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load villages' });
  }
}

export { getCities, getVillages };
