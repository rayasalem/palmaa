import { createHostedSession, handleNotification } from './cybersource.service.js';
import logger, { sanitizeForLog } from '../../../utils/logger.js';

function normalizeOrderId(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const id = value.id ?? value.orderId ?? value.order_id ?? value.order?.id ?? value.order?.orderId;
    if (id != null && typeof id === 'string') return id.trim();
    if (id != null) return String(id).trim();
  }
  return String(value);
}

async function createHostedSessionHandler(req, res) {
  try {
    const { orderId: rawOrderId, amount } = req.body || {};
    const orderId = normalizeOrderId(rawOrderId);
    if (!orderId || amount == null) {
      return res.status(400).json({ success: false, error: 'orderId and amount are required' });
    }

    const session = await createHostedSession(orderId, Number(amount));
    return res.status(200).json({
      success: true,
      action_url: session.actionUrl,
      fields: session.fields,
    });
  } catch (err) {
    logger.error('[cybersource] createHostedSession error', { message: err.message });
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create hosted checkout session',
    });
  }
}

async function notificationHandler(req, res) {
  try {
    const payload = req.body || {};
    logger.info('[cybersource] notify raw body', sanitizeForLog(payload));

    const result = await handleNotification(payload);

    if (!result.success && result.decision === 'INVALID_SIGNATURE') {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    return res.status(200).json({
      success: result.success,
      decision: result.decision,
      orderId: result.orderId,
    });
  } catch (err) {
    logger.error('[cybersource] notification handler error', { message: err.message });
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
}

export { createHostedSessionHandler, notificationHandler };
