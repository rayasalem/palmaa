import * as analyticsService from '../services/analyticsService.js';
import logger from '../utils/logger.js';

async function adminOverview(req, res) {
  try {
    const { data, error } = await analyticsService.getAdminOverview();
    if (error) return res.status(500).json({ success: false, error: error.message || 'Failed to load analytics' });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error('analytics adminOverview unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function merchantOverview(req, res) {
  try {
    const merchantId = req.auth && req.auth.sub;
    if (!merchantId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { data, error } = await analyticsService.getMerchantOverview(merchantId);
    if (error) return res.status(500).json({ success: false, error: error.message || 'Failed to load analytics' });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error('analytics merchantOverview unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { adminOverview, merchantOverview };

