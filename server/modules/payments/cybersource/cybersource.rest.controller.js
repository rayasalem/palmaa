import { authorizePayment, capturePayment } from './cybersource.rest.service.js';
import { getEnv } from '../../../config/env.js';
import logger from '../../../utils/logger.js';
import * as paymentService from '../../../services/paymentService.js';

const isProd = getEnv('NODE_ENV') === 'production';

// Official Cybersource sandbox test card (Testing Guide: https://developer.cybersource.com/hello-world/testing-guide.html)
const SANDBOX_TEST_CARD = {
  number: '4111111111111111',
  expirationMonth: '12',
  expirationYear: '2031',
  securityCode: '123',
};

const SANDBOX_BILL_TO = {
  firstName: 'John',
  lastName: 'Doe',
  address1: '123 Main Street',
  locality: 'New York',
  administrativeArea: 'NY',
  postalCode: '10001',
  country: 'US',
  email: 'test@example.com',
  phoneNumber: '12125551234',
};

/**
 * POST /api/payments/cybersource/rest/process
 * Main checkout payment: authorize + capture via REST API (Sandbox), then mark order paid.
 * Body: { orderId: string, amount: number, currency?: string }
 * No Hosted Checkout, no outlet_id/terminal_id. Uses official test card in Sandbox.
 */
async function processRestPaymentHandler(req, res) {
  const orderId = req.body?.orderId;
  const amount = Number(req.body?.amount);
  const currency = (req.body?.currency || 'USD').toUpperCase();

  if (!orderId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'orderId and a positive amount are required.',
    });
  }

  try {
    const reference = String(orderId);
    const auth = await authorizePayment({
      amount,
      currency,
      reference,
      card: SANDBOX_TEST_CARD,
      billTo: SANDBOX_BILL_TO,
    });

    if (!auth.success) {
      const cybersourceMsg = auth.data?.message || auth.data?.reason || (auth.data && JSON.stringify(auth.data));
      const is404 = auth.status === 404;
      const errorMsg = is404
        ? 'Cybersource returned "Resource not found". Ensure your test merchant has REST API (pts/v2/payments) enabled in Business Center.'
        : auth.error?.message || 'Authorization failed';
      logger.warn('[cybersource-rest-process] authorization failed', {
        orderId,
        status: auth.status,
        message: errorMsg,
      });
      return res.status(502).json({
        success: false,
        stage: 'authorization',
        error: errorMsg,
        raw: cybersourceMsg || (is404 ? 'Resource not found' : null),
      });
    }

    const decision = (auth.decision && String(auth.decision).toUpperCase()) || '';
    if (decision !== 'AUTHORIZED') {
      return res.status(400).json({
        success: false,
        stage: 'authorization',
        error: 'Transaction not authorized: ' + (auth.decision || 'unknown'),
        raw: auth.data || null,
      });
    }

    const paymentId = auth.id;
    logger.info('[cybersource-rest-process] authorization success', { orderId, paymentId, amount, currency });

    const capture = await capturePayment({ paymentId, amount, currency, reference });
    if (!capture.success) {
      return res.status(capture.status || 502).json({
        success: false,
        stage: 'capture',
        error: capture.error?.message || 'Capture failed',
        paymentId,
        raw: capture.data || null,
      });
    }

    const idempotencyKey = paymentId ? `cybersource-rest:${paymentId}` : undefined;
    const { error } = await paymentService.handlePaymentCallback(orderId, 'success', idempotencyKey);
    if (error) {
      logger.error('[cybersource-rest-process] handlePaymentCallback failed', { orderId, message: error.message });
      return res.status(500).json({
        success: false,
        error: 'Payment captured but order update failed: ' + error.message,
        orderId,
      });
    }

    logger.info('[cybersource-rest-process] payment complete', { orderId, paymentId, captureId: capture.id });
    return res.status(200).json({
      success: true,
      orderId,
      paymentId,
      captureId: capture.id,
    });
  } catch (err) {
    logger.error('[cybersource-rest-process] unexpected error', { message: err.message });
    return res
      .status(500)
      .json({ success: false, error: err.message || 'Unexpected Cybersource REST error' });
  }
}

/**
 * POST /api/payments/cybersource/rest/test
 * Body (optional): { amount, currency, reference }
 * Uses official Cybersource sandbox test card. Blocked in production.
 */
async function testRestPaymentHandler(req, res) {
  if (isProd) {
    return res
      .status(403)
      .json({ success: false, error: 'Cybersource REST test endpoint is disabled in production.' });
  }

  const amount = Number(req.body?.amount) || 59.5;
  const currency = (req.body?.currency || 'USD').toUpperCase();
  const reference = req.body?.reference;

  try {
    const auth = await authorizePayment({
      amount,
      currency,
      reference,
      card: SANDBOX_TEST_CARD,
      billTo: SANDBOX_BILL_TO,
    });
    if (!auth.success) {
      return res.status(auth.status || 502).json({
        success: false,
        stage: 'authorization',
        error: auth.error?.message || 'Authorization failed',
        raw: auth.data || null,
      });
    }

    const paymentId = auth.id;
    const capture = await capturePayment({ paymentId, amount, currency, reference });
    if (!capture.success) {
      return res.status(capture.status || 502).json({
        success: false,
        stage: 'capture',
        error: capture.error?.message || 'Capture failed',
        raw: capture.data || null,
        paymentId,
      });
    }

    return res.status(200).json({
      success: true,
      amount,
      currency,
      paymentId,
      captureId: capture.id,
      authorization: auth.data,
      capture: capture.data,
    });
  } catch (err) {
    logger.error('[cybersource-rest-test] unexpected error', { message: err.message });
    return res
      .status(500)
      .json({ success: false, error: err.message || 'Unexpected Cybersource REST error' });
  }
}

export { processRestPaymentHandler, testRestPaymentHandler };

