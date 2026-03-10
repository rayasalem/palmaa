/**
 * Auth OTP: generate, save, find, verify, invalidate.
 */

import crypto from 'crypto';
import { supabase } from '../../config/supabaseClient.js';
import logger from '../../utils/logger.js';

const OTP_TABLE = 'otp_codes';
export const OTP_EXPIRY_MINUTES = 15;

export function generateOtp() {
  const n = crypto.randomInt(0, 1000000);
  return n.toString().padStart(6, '0');
}

export async function saveOtp(email, code, type) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  console.log('[authService] Saving OTP for', email, 'type', type, 'expires', expiresAt);
  const { data, error } = await supabase
    .from(OTP_TABLE)
    .insert({ email: email.toLowerCase().trim(), code, type, expires_at: expiresAt })
    .select()
    .single();
  if (error) {
    logger.error('authService saveOtp error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

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

export async function invalidateOtp(email, type) {
  const emailNorm = email.toLowerCase().trim();
  await supabase.from(OTP_TABLE).delete().eq('email', emailNorm).eq('type', type);
  console.log('[authService] Invalidated OTP for', emailNorm, type);
}

export async function verifyOtp(email, otp, type, invalidateAfter = true) {
  const { data, error } = await findValidOtp(email, otp, type);
  if (error || !data) return { success: false, error: error || { message: 'Invalid or expired OTP' } };
  if (invalidateAfter) await invalidateOtp(email, type);
  return { success: true, error: null };
}
