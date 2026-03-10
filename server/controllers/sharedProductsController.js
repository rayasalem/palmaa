/**
 * Public shared products controller: list by broker_id (for public broker profile).
 */

import * as sharedProductsService from '../services/sharedProductsService.js';

async function listByBrokerId(req, res) {
  try {
    const brokerId = req.query && req.query.broker_id;
    if (!brokerId) {
      return res.status(400).json({ success: false, error: 'broker_id is required' });
    }
    const { data, error } = await sharedProductsService.listByBrokerId(brokerId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, shared: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { listByBrokerId };
