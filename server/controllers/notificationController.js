/**
 * Notification controller: list notifications, mark as read.
 */

import * as notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';

async function list(req, res) {
  try {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const unreadOnly = req.query.unread === 'true';
    const { data, error } = await notificationService.listByUserId(userId, { unreadOnly });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, notifications: data });
  } catch (err) {
    logger.error('notification list unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function markRead(req, res) {
  try {
    const userId = req.auth?.sub;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!id) return res.status(400).json({ success: false, error: 'Notification id is required' });
    const { data, error } = await notificationService.markRead(id, userId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, notification: data });
  } catch (err) {
    logger.error('notification markRead unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { list, markRead };
