/**
 * Cybersource Simple Order REST API – Sandbox integration using HTTP Signature.
 * - No Secure Acceptance Hosted Checkout. No outlet_id / terminal_id (bank does not provide for testing).
 * - Endpoints: POST /pts/v2/payments (authorize), POST /pts/v2/payments/{id}/captures (capture).
 * - Sandbox: https://apitest.cybersource.com. For LIVE, set CYBS_REST_HOST to production.
 */

import crypto from 'node:crypto';
import axios from 'axios';
import { getEnv } from '../../../config/env.js';
import logger, { sanitizeForLog } from '../../../utils/logger.js';

function getRestConfig() {
  const host = getEnv('CYBS_REST_HOST', 'https://apitest.cybersource.com');
  const merchantId = getEnv('CYBS_REST_MERCHANT_ID') || getEnv('CYBERSOURCE_MERCHANT_ID');
  const keyId = getEnv('CYBS_REST_KEY_ID') || getEnv('CYBERSOURCE_KEY_ID');
  const secretKey = getEnv('CYBS_REST_SECRET_KEY') || getEnv('CYBERSOURCE_SECRET_KEY');

  if (!merchantId || !keyId || !secretKey) {
    logger.warn(
      '[cybersource-rest] Missing REST credentials. Set CYBS_REST_MERCHANT_ID, CYBS_REST_KEY_ID, CYBS_REST_SECRET_KEY in server/.env'
    );
  }

  return {
    host: host.replace(/\/$/, ''),
    merchantId,
    keyId,
    secretKey,
  };
}

function sanitizePaymentPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = JSON.parse(JSON.stringify(payload));
  if (clone.paymentInformation && clone.paymentInformation.card) {
    const card = clone.paymentInformation.card;
    if (card.number) {
      const last4 = String(card.number).slice(-4);
      card.number = `************${last4}`;
    }
    if (card.securityCode) {
      card.securityCode = '***';
    }
  }
  return clone;
}

/**
 * Build HTTP Signature headers for Cybersource REST API.
 * Reference: Cybersource HTTP Signature Authentication – Shared Secret is Base64-decoded before HMAC.
 */
function buildHttpSignatureHeaders(method, resourcePath, body, cfg) {
  const url = new URL(cfg.host);
  const host = url.hostname;
  const bodyString = body ? JSON.stringify(body) : '';
  const date = new Date().toUTCString();

  const digest = `SHA-256=${crypto
    .createHash('sha256')
    .update(bodyString, 'utf8')
    .digest('base64')}`;

  // (request-target) = method (lowercase) + space + path, e.g. "post /pts/v2/payments"
  const target = `${method.toLowerCase()} ${resourcePath}`;

  const signingString = [
    `host: ${host}`,
    `date: ${date}`,
    `(request-target): ${target}`,
    `digest: ${digest}`,
    `v-c-merchant-id: ${cfg.merchantId}`,
  ].join('\n');

  // Cybersource: Shared Secret Key is Base64-encoded; decode before using in HMAC (see official doc).
  let hmacKey = cfg.secretKey;
  try {
    const decoded = Buffer.from(cfg.secretKey, 'base64');
    if (decoded.length > 0) {
      hmacKey = decoded;
    }
  } catch (_) {
    // keep raw string if not valid base64
  }

  const signature = crypto
    .createHmac('sha256', hmacKey)
    .update(signingString, 'utf8')
    .digest('base64');

  const signatureHeader = [
    `keyid="${cfg.keyId}"`,
    'algorithm="HmacSHA256"',
    'headers="host date (request-target) digest v-c-merchant-id"',
    `signature="${signature}"`,
  ].join(',');

  return {
    host,
    date,
    digest,
    signature: signatureHeader,
    'v-c-merchant-id': cfg.merchantId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function restRequest(method, resourcePath, body) {
  const cfg = getRestConfig();
  if (!cfg.merchantId || !cfg.keyId || !cfg.secretKey) {
    throw new Error('Cybersource REST credentials are not configured.');
  }

  const url = `${cfg.host}${resourcePath}`;
  const sanitizedBody = sanitizePaymentPayload(body);
  logger.info('[cybersource-rest] request', {
    method,
    url,
    body: sanitizeForLog(sanitizedBody),
  });

  const headers = buildHttpSignatureHeaders(method, resourcePath, body, cfg);

  try {
    const response = await axios({
      method,
      url,
      headers,
      data: body ? JSON.stringify(body) : undefined,
      timeout: 30000,
    });
    logger.info('[cybersource-rest] response', {
      status: response.status,
      data: sanitizeForLog(response.data),
    });
    return { data: response.data, status: response.status, error: null };
  } catch (err) {
    const res = err.response;
    const status = res && res.status;
    const data = res && res.data;
    logger.error('[cybersource-rest] error response', {
      status,
      data: sanitizeForLog(data),
      message: err.message,
    });
    if (status === 401) {
      logger.warn('[cybersource-rest] 401 Unauthorized: check CYBS_REST_MERCHANT_ID, CYBS_REST_KEY_ID, CYBS_REST_SECRET_KEY. Secret must be Base64-decoded for HMAC per Cybersource doc.');
    }
    return {
      data: data || null,
      status: status || 500,
      error: new Error(
        (data && data.message) ||
          (data && data.reason) ||
          err.message ||
          'Cybersource REST request failed'
      ),
    };
  }
}

/**
 * Authorize a payment (no capture).
 * @param {object} params - { amount, currency, reference, card, billTo }
 */
async function authorizePayment(params) {
  const { amount, currency, reference, card, billTo } = params;
  const totalAmount = Number(amount).toFixed(2);

  const body = {
    clientReferenceInformation: {
      code: reference || `ORDER-${Date.now()}`,
    },
    processingInformation: {
      capture: false,
    },
    orderInformation: {
      amountDetails: {
        totalAmount,
        currency,
      },
      billTo,
    },
    paymentInformation: {
      card,
    },
  };

  const { data, status, error } = await restRequest('POST', '/pts/v2/payments', body);
  if (error) {
    return { success: false, status, data, error };
  }
  const decision = (data && data.status) || data.decision || '';
  const id = data && (data.id || data.transactionId);
  return {
    success: true,
    status,
    data,
    id,
    decision,
  };
}

/**
 * Capture a previously authorized payment.
 * @param {object} params - { paymentId, amount, currency, reference }
 */
async function capturePayment(params) {
  const { paymentId, amount, currency, reference } = params;
  if (!paymentId) {
    throw new Error('paymentId is required for capture');
  }
  const totalAmount = Number(amount).toFixed(2);

  const body = {
    clientReferenceInformation: {
      code: reference || `CAPTURE-${paymentId}`,
    },
    orderInformation: {
      amountDetails: {
        totalAmount,
        currency,
      },
    },
  };

  const path = `/pts/v2/payments/${encodeURIComponent(paymentId)}/captures`;
  const { data, status, error } = await restRequest('POST', path, body);
  if (error) {
    return { success: false, status, data, error };
  }
  const captureId = data && (data.id || data.transactionId);
  const decision = (data && data.status) || data.decision || '';
  return {
    success: true,
    status,
    data,
    id: captureId,
    decision,
  };
}

export { authorizePayment, capturePayment };

