/**
 * Updates a user's password in the database by email.
 * Caller must have already verified OTP for password_reset.
 */

import { supabase } from '../../config/supabaseClient.js';
import { USERS_TABLE } from '../constants.js';
import { hashPassword } from './hashPassword.js';

/**
 * Update user password in Supabase by email.
 * @param {string} email - User email (normalized)
 * @param {string} newPassword - Plain new password; will be hashed
 * @returns {Promise<{ data: object | null, error: object | null }>}
 */
export async function updatePassword(email, newPassword) {
  const emailNorm = email.toLowerCase().trim();
  const hashed = await hashPassword(newPassword);
  console.log('[authService] Updating password for', emailNorm);
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({ password: hashed, updated_at: new Date().toISOString() })
    .eq('email', emailNorm)
    .select()
    .single();
  if (error) {
    console.error('[authService] updatePassword error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}
