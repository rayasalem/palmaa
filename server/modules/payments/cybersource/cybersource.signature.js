/**
 * Cybersource Secure Acceptance Hosted Checkout – HMAC SHA256 signature.
 * Ref: Required Signed Fields, Scripting Language Samples (keyed-HMAC, shared secret).
 * Order of fields in signed_field_names defines the string-to-sign; must match exactly.
 */

import crypto from 'node:crypto';

/**
 * Build the canonical string to sign from the given fields.
 * The order of fields MUST match the comma-separated signed_field_names list.
 *
 * @param {Record<string, string>} fields
 * @param {string} signedFieldNames
 * @returns {string}
 */
function buildStringToSign(fields, signedFieldNames) {
  const names = String(signedFieldNames || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  return names.map((name) => `${name}=${fields[name] ?? ''}`).join(',');
}

/**
 * Generate HMAC-SHA256 signature in Base64 encoding.
 *
 * @param {Record<string, string>} fields
 * @param {string} signedFieldNames
 * @param {string} secretKey
 * @returns {string}
 */
function signFields(fields, signedFieldNames, secretKey) {
  if (!secretKey) {
    throw new Error('Cybersource secret key is not configured (CYBS_SECRET_KEY).');
  }
  const toSign = buildStringToSign(fields, signedFieldNames);
  return crypto.createHmac('sha256', secretKey).update(toSign, 'utf8').digest('base64');
}

/**
 * Verify a Cybersource Secure Acceptance signature using constant‑time comparison.
 *
 * @param {Record<string, string>} fields - parsed payload (including signature & signed_field_names)
 * @param {string} secretKey
 * @returns {boolean}
 */
function verifySignature(fields, secretKey) {
  const provided = fields.signature || fields.Signature;
  const signedFieldNames = fields.signed_field_names || fields.signedFieldNames;
  if (!provided || !signedFieldNames) return false;

  const expected = signFields(fields, signedFieldNames, secretKey);

  const providedBuf = Buffer.from(String(provided), 'utf8');
  const expectedBuf = Buffer.from(String(expected), 'utf8');

  // timingSafeEqual requires equal length; mismatch means invalid signature
  if (providedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export { signFields, verifySignature, buildStringToSign };

