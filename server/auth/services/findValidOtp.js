/**
 * Looks up a valid (non-expired) OTP for an email and type.
 * Used by verify-email and reset-password to validate the code before proceeding.
 */

import { supabase } from '../../config/supabaseClient.js';
import { OTP_TABLE } from '../constants.js';

/**
 * Find valid OTP for email and type: must match code and not be expired.
 * @param {string} email - User email (will be normalized)
 * @param {string} code - 6-digit OTP entered by user
 * @param {string} type - 'email_verification' | 'password_reset'
 * @returns {Promise<{ data: object | null, error: object | null }>}
 */
export async function findValidOtp(email, code, type) {
  const emailNorm = email.toLowerCase().trim();
  const { data: rows, error } = await supabase
    .from(OTP_TABLE)
    .select('*')
    .eq('email', emailNorm)
    .eq('code', String(code).trim())
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !rows || rows.length === 0) return { data: null, error: error || new Error('OTP not found') };
  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) {
    console.log('[authService] OTP expired for', emailNorm);
    return { data: null, error: { message: 'OTP expired' } };
  }
  return { data: row, error: null };
}
