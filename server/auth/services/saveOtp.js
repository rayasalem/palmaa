/**
 * Persists an OTP code to the database with an expiration time.
 */

import { supabase } from '../../config/supabaseClient.js';
import { OTP_TABLE, OTP_EXPIRY_MINUTES } from '../constants.js';

/**
 * Save OTP to Supabase for given email and type. Sets expiration.
 * @param {string} email - Normalized (lowercase) email
 * @param {string} code - 6-digit OTP string
 * @param {string} type - 'email_verification' | 'password_reset'
 * @returns {Promise<{ data: object | null, error: object | null }>}
 */
export async function saveOtp(email, code, type) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  console.log('[authService] Saving OTP for', email, 'type', type, 'expires', expiresAt);
  const { data, error } = await supabase
    .from(OTP_TABLE)
    .insert({ email: email.toLowerCase().trim(), code, type, expires_at: expiresAt })
    .select()
    .single();
  if (error) {
    console.error('[authService] saveOtp error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}
