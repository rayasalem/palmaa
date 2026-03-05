/**
 * Cybersource REST client (Sandbox by default).
 * Uses HTTP Signature with HMAC-SHA256 as per Cybersource docs.
 * NOTE: Do NOT log card data here.
 */

import https from 'node:https';
import crypto from 'node:crypto';
import logger from '../utils/logger.js';

const CYBERSOURCE_HOST = process.env.CYBERSOURCE_HOST || 'apitest.cybersource.com';
const CYBERSOURCE_PAYMENTS_PATH = '/pts/v2/payments';

function isConfigured() {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID;
  const keyId = process.env.CYBERSOURCE_KEY_ID;
  const secretKey = process.env.CYBERSOURCE_SECRET_KEY;
  return !!(merchantId && keyId && secretKey);
}

function ensureConfig() {
  const merchantId = process.env.CYBERSOURCE_MERCHANT_ID;
  const keyId = process.env.CYBERSOURCE_KEY_ID;
  const secretKey = process.env.CYBERSOURCE_SECRET_KEY;
  if (!merchantId || !keyId || !secretKey) {
    throw new Error('Cybersource is not configured. Please set CYBERSOURCE_MERCHANT_ID, CYBERSOURCE_KEY_ID, CYBERSOURCE_SECRET_KEY');
  }
  return { merchantId, keyId, secretKey };
}

function buildSignatureHeaders(path, method, bodyString) {
  const { merchantId, keyId, secretKey } = ensureConfig();
  const host = CYBERSOURCE_HOST;
  const date = new Date().toUTCString();
  const digestHash = crypto.createHash('sha256').update(bodyString, 'utf8').digest('base64');
  const digestHeader = `SHA-256=${digestHash}`;
  const requestTarget = `${method.toLowerCase()} ${path}`;

  const signingString =
    `host: ${host}\n` +
    `date: ${date}\n` +
    `request-target: ${requestTarget}\n` +
    `digest: ${digestHeader}\n` +
    `v-c-merchant-id: ${merchantId}`;

  const keyBytes = Buffer.from(secretKey, 'base64');
  const signature = crypto
    .createHmac('sha256', keyBytes)
    .update(signingString, 'utf8')
    .digest('base64');

  const signatureHeader = [
    `keyid="${keyId}"`,
    'algorithm="HmacSHA256"',
    'headers="host date request-target digest v-c-merchant-id"',
    `signature="${signature}"`,
  ].join(', ');

  return {
    host,
    date,
    digestHeader,
    merchantId,
    signatureHeader,
  };
}

function httpPostJson(path, body) {
  const method = 'POST';
  const bodyString = JSON.stringify(body);
  const { host, date, digestHeader, merchantId, signatureHeader } = buildSignatureHeaders(path, method, bodyString);

  const options = {
    host,
    path,
    method,
    headers: {
      Host: host,
      Date: date,
      Digest: digestHeader,
      'v-c-merchant-id': merchantId,
      Signature: signatureHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyString),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          logger.error('Cybersource response parse error', { statusCode: res.statusCode });
          return reject(new Error('Failed to parse Cybersource response'));
        }
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          logger.error('Cybersource HTTP error', {
            statusCode: res.statusCode,
            reason: parsed && parsed.reason || parsed && parsed.message || 'Unknown',
          });
          reject(new Error(parsed && (parsed.reason || parsed.message) || `Cybersource error ${res.statusCode}`));
        }
      });
    });
    req.on('error', (err) => {
      logger.error('Cybersource HTTP request error', { message: err.message });
      reject(err);
    });
    req.write(bodyString);
    req.end();
  });
}

/**
 * Create a card payment in Cybersource (Sandbox host by default).
 * If Cybersource credentials are not set, returns a simulated AUTHORIZED for local/dev testing.
 *
 * card: { number, expMonth, expYear, cvv, holder }
 */
async function createCardPayment({ orderId, amount, currency, card }) {
  if (!isConfigured()) {
    logger.info('Cybersource not configured; simulating AUTHORIZED for local/dev');
    return {
      decision: 'AUTHORIZED',
      transactionId: `sim-${Date.now()}-${String(orderId).slice(-8)}`,
      raw: null,
    };
  }

  const totalAmount = (Number(amount) || 0).toFixed(2);
  const body = {
    clientReferenceInformation: {
      code: String(orderId),
    },
    processingInformation: {
      capture: true,
    },
    orderInformation: {
      amountDetails: {
        totalAmount,
        currency: currency || 'USD',
      },
    },
    paymentInformation: {
      card: {
        number: card.number,
        expirationMonth: card.expMonth,
        expirationYear: card.expYear,
        securityCode: card.cvv,
      },
    },
  };

  const resp = await httpPostJson(CYBERSOURCE_PAYMENTS_PATH, body);

  // According to Cybersource Payments API, status field indicates the decision (e.g. AUTHORIZED, DECLINED)
  const decision = resp.status || resp.statusCode || 'UNKNOWN';
  const transactionId = resp.id || resp.requestId || null;

  return {
    decision: String(decision).toUpperCase(),
    transactionId,
    raw: resp,
  };
}

export { createCardPayment };

