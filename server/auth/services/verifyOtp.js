/**
 * Verifies an OTP for email and type; optionally invalidates it after success.
 */

import { findValidOtp } from './findValidOtp.js';
import { invalidateOtp } from './invalidateOtp.js';

/**
 * Verify OTP for email and type. Returns success and optionally invalidates.
 * @param {string} email - User email
 * @param {string} otp - 6-digit code
 * @param {string} type - 'email_verification' | 'password_reset'
 * @param {boolean} invalidateAfter - If true, delete OTP after successful check
 * @returns {Promise<{ success: boolean, error: object | null }>}
 */
export async function verifyOtp(email, otp, type, invalidateAfter = true) {
  const { data, error } = await findValidOtp(email, otp, type);
  if (error || !data) return { success: false, error: error || { message: 'Invalid or expired OTP' } };
  if (invalidateAfter) await invalidateOtp(email, type);
  return { success: true, error: null };
}
