/**
 * Cybersource Secure Acceptance Hosted Checkout (Redirection).
 * Sandbox only. No outlet_id, terminal_id, or processor configuration per official docs.
 * Ref: Secure Acceptance Hosted Checkout Guide, Required Signed Fields, Scripting Samples.
 */

import crypto from 'node:crypto';
import { getEnv } from '../../../config/env.js';
import { signFields, verifySignature } from './cybersource.signature.js';
import logger, { sanitizeForLog } from '../../../utils/logger.js';
import * as paymentService from '../../../services/paymentService.js';

/** Official required signed fields – exact order per Required Signed Fields doc. Excluded: card_number, card_cvn, signature. */
const REQUIRED_SIGNED_FIELDS = [
  'access_key',
  'amount',
  'currency',
  'locale',
  'profile_id',
  'reference_number',
  'signed_date_time',
  'signed_field_names',
  'transaction_type',
  'transaction_uuid',
];

function getConfig() {
  const profileId = getEnv('CYBS_PROFILE_ID');
  const accessKey = getEnv('CYBS_ACCESS_KEY');
  const secretKey = getEnv('CYBS_SECRET_KEY');
  const hostedPayUrl =
    getEnv('CYBS_HOSTED_PAY_URL') || 'https://testsecureacceptance.cybersource.com/pay';
  const locale = getEnv('CYBS_LOCALE', 'ar-xn');
  const currency = getEnv('CYBS_CURRENCY', 'USD');

  if (!profileId || !accessKey || !secretKey) {
    logger.warn(
      '[cybersource] Hosted Checkout env not fully configured. Set CYBS_PROFILE_ID, CYBS_ACCESS_KEY, CYBS_SECRET_KEY.'
    );
  }

  return {
    profileId,
    accessKey,
    secretKey,
    hostedPayUrl,
    locale,
    currency,
  };
}

/**
 * Create a hosted checkout session: signed field payload for the frontend form.
 *
 * @param {string} orderId
 * @param {number} amount
 */
async function createHostedSession(orderId, amount) {
  const cfg = getConfig();
  if (!cfg.profileId || !cfg.accessKey || !cfg.secretKey) {
    throw new Error('Cybersource Hosted Checkout is not configured.');
  }

  const numAmount = Number(amount);
  if (!orderId || !Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error('Invalid orderId or amount.');
  }

  const transactionUuid = crypto.randomUUID();
  const signedDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // ISO 8601 UTC

  // Only official request fields per Required Signed Fields doc. No outlet_id, terminal_id, or processor fields.
  const signedFieldNames = REQUIRED_SIGNED_FIELDS.join(',');
  const fields = {
    access_key: cfg.accessKey,
    profile_id: cfg.profileId,
    transaction_uuid: transactionUuid,
    signed_date_time: signedDateTime,
    transaction_type: 'sale',
    reference_number: String(orderId),
    amount: numAmount.toFixed(2),
    currency: cfg.currency,
    locale: cfg.locale,
    signed_field_names: signedFieldNames,
  };

  const signature = signFields(fields, signedFieldNames, cfg.secretKey);

  // Log only field names sent (no secrets) so you can verify we do NOT send merchant_category_code, usd_outlet_id, usd_terminal_id
  const fieldNamesSent = Object.keys({ ...fields, signature }).sort().join(', ');
  logger.info(
    `[cybersource-hosted] session created orderId=${sanitizeForLog(orderId)} fields_sent=[${fieldNamesSent}]`
  );

  return {
    actionUrl: cfg.hostedPayUrl,
    fields: {
      ...fields,
      signature,
    },
  };
}

/**
 * Handle merchant notification from Cybersource (server-to-server POST).
 * Validates signature and updates order status using existing paymentService.
 *
 * @param {Record<string, string>} payload
 * @returns {{ success: boolean, decision: string, orderId: string | null }}
 */
async function handleNotification(payload) {
  const cfg = getConfig();
  if (!cfg.secretKey) {
    throw new Error('Cybersource secret key is not configured.');
  }

  logger.info('[cybersource] notify payload', sanitizeForLog(payload));

  const isValid = verifySignature(payload, cfg.secretKey);
  if (!isValid) {
    logger.warn('[cybersource] Invalid signature on notification', {
      signed_field_names: payload.signed_field_names,
    });
    return { success: false, decision: 'INVALID_SIGNATURE', orderId: null };
  }

  const decision = String(payload.decision || '').toUpperCase() || 'ERROR';
  const orderId =
    payload.req_reference_number ||
    payload.reference_number ||
    payload.req_referenceNumber ||
    null;
  const transactionId = payload.transaction_id || payload.transactionId || null;

  if (!orderId) {
    logger.error('[cybersource] Notification missing order reference_number', {
      decision,
    });
    return { success: false, decision, orderId: null };
  }

  const idempotencyKey = transactionId ? `cybersource-sa:${transactionId}` : undefined;

  if (decision === 'ACCEPT') {
    const { error } = await paymentService.handlePaymentCallback(
      orderId,
      'success',
      idempotencyKey
    );
    if (error) {
      logger.error('[cybersource] handlePaymentCallback error (ACCEPT)', {
        message: error.message,
        orderId,
      });
      return { success: false, decision: 'ERROR', orderId };
    }
    return { success: true, decision, orderId };
  }

  // For non-ACCEPT decisions, mark as failed but do not throw – application can retry or show error.
  const { error } = await paymentService.handlePaymentCallback(
    orderId,
    'failed',
    idempotencyKey
  );
  if (error) {
    logger.error('[cybersource] handlePaymentCallback error (NON-ACCEPT)', {
      message: error.message,
      orderId,
      decision,
    });
  }

  return { success: false, decision, orderId };
}

export { createHostedSession, handleNotification };

