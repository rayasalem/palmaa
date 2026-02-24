/**
 * Payment controller: create payment (sandbox URL), callback (paid/failed).
 * Replace with real bank integration later.
 */

import * as paymentService from '../services/paymentService.js';
import logger, { sanitizeForLog } from '../utils/logger.js';

async function createPayment(req, res) {
  try {
    const { amount, orderId, return_url: returnUrl } = req.body;
    if (orderId == null || String(orderId).trim() === '') {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    logger.info('payment create', sanitizeForLog({ orderId, amount: numAmount }));
    const result = await paymentService.createPayment(orderId, numAmount, returnUrl);
    if (result.error) {
      logger.error('payment create error', { message: result.error.message });
      return res.status(500).json({ success: false, error: result.error.message || 'Failed to create payment' });
    }
    const payload = {
      success: true,
      paymentUrl: result.paymentUrl ?? null,
      orderId,
      amount: numAmount,
    };
    if (result.sandboxSimulation) payload.sandboxSimulation = true;
    return res.status(200).json(payload);
  } catch (err) {
    logger.error('payment create unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function paymentCallback(req, res) {
  try {
    const { orderId, status } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (orderId == null || String(orderId).trim() === '') {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    if (status == null || String(status).trim() === '') {
      return res.status(400).json({ success: false, error: 'status is required (e.g. success or failed)' });
    }
    logger.info('payment callback', sanitizeForLog({ orderId, status }));
    const { data, error } = await paymentService.handlePaymentCallback(orderId, status, idempotencyKey);
    if (error) {
      logger.error('payment callback error', { message: error.message });
      return res.status(500).json({ success: false, error: error.message || 'Failed to process callback' });
    }
    const newStatus = String(status).toLowerCase() === 'success' ? 'paid' : 'failed';
    return res.status(200).json({
      success: true,
      orderId,
      orderStatus: newStatus,
      order: data,
      message: 'Simulate with status=success or status=failed for testing.',
    });
  } catch (err) {
    logger.error('payment callback unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { createPayment, paymentCallback };
