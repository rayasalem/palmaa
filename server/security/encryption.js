/**
 * AES-256-GCM encryption for sensitive fields.
 * Key must be 32 bytes (64 hex chars) in ENCRYPTION_KEY.
 */

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;
const KEY_LEN = 32;

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || typeof raw !== 'string') return null;
  const hex = raw.trim().replace(/^0x/, '');
  if (hex.length !== KEY_LEN * 2) return null;
  try {
    return Buffer.from(hex, 'hex');
  } catch {
    return null;
  }
}

export function encrypt(plaintext) {
  const key = getKey();
  if (!key) return { encrypted: null, error: 'ENCRYPTION_KEY not set or invalid (32-byte hex)' };
  try {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, enc]);
    return { encrypted: combined.toString('base64'), error: null };
  } catch (err) {
    return { encrypted: null, error: err.message };
  }
}

export function decrypt(base64Combined) {
  const key = getKey();
  if (!key) return { decrypted: null, error: 'ENCRYPTION_KEY not set or invalid' };
  try {
    const buf = Buffer.from(base64Combined, 'base64');
    if (buf.length < IV_LEN + AUTH_TAG_LEN) return { decrypted: null, error: 'Invalid payload' };
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const enc = buf.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = decipher.update(enc);
    const final = decipher.final();
    return { decrypted: (dec + final).toString('utf8'), error: null };
  } catch (err) {
    return { decrypted: null, error: err.message };
  }
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export default { encrypt, decrypt, hashToken };
