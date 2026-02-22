/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Used for email verification and password reset flows.
 */

import crypto from 'crypto';

/**
 * Generate a secure random 6-digit OTP (numeric only).
 * @returns {string} Exactly 6 digits, e.g. "042817"
 */
export function generateOtp() {
  const n = crypto.randomInt(0, 1000000);
  return n.toString().padStart(6, '0');
}
