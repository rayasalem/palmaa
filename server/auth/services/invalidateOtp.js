/**
 * Invalidates all OTPs for an email and type (e.g. after successful verification).
 */

import { supabase } from '../../config/supabaseClient.js';
import { OTP_TABLE } from '../constants.js';

/**
 * Invalidate OTP: deletes all matching rows for email and type.
 * @param {string} email - User email (normalized)
 * @param {string} type - 'email_verification' | 'password_reset'
 */
export async function invalidateOtp(email, type) {
  const emailNorm = email.toLowerCase().trim();
  await supabase.from(OTP_TABLE).delete().eq('email', emailNorm).eq('type', type);
  console.log('[authService] Invalidated OTP for', emailNorm, type);
}
