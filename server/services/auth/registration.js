/**
 * Auth registration: insert user, send verification OTP.
 */

import bcrypt from 'bcrypt';
import { supabase } from '../../config/supabaseClient.js';
import * as verification from './verification.js';
import { hashPassword } from './utils.js';
import logger from '../../utils/logger.js';

const USERS_TABLE = 'users';

export async function registerUser(params) {
  const { email, password, name, role, termsAccepted, termsVersion } = params;
  const emailNorm = email.toLowerCase().trim();
  const passTrimmed = typeof password === 'string' ? password.trim() : password;
  const hashed = await hashPassword(passTrimmed);
  const roleVal = role || 'CUSTOMER';
  console.log('[authService] Registering user', emailNorm, 'role', roleVal);
  const now = new Date().toISOString();
  const insertPayload = {
    email: emailNorm,
    password: hashed,
    name: name || emailNorm,
    role: roleVal,
    email_verified: false,
    created_at: now,
  };

  if (roleVal === 'MERCHANT' && termsAccepted) {
    insertPayload.terms_accepted = true;
    insertPayload.terms_accepted_at = now;
    if (termsVersion) insertPayload.terms_version = termsVersion;
    insertPayload.status = 'APPROVED';
    insertPayload.is_approved = true;
    insertPayload.subscription_type = 'free';
    insertPayload.subscription_start_date = now;
    insertPayload.subscription_end_date = null;
    insertPayload.subscription_status = 'active';
  } else if (roleVal === 'CUSTOMER') {
    insertPayload.status = 'ACTIVE';
    insertPayload.is_approved = true;
  } else if (roleVal === 'BROKER') {
    insertPayload.status = 'ACTIVE';
    insertPayload.is_approved = true;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 180);
    insertPayload.subscription_type = 'free';
    insertPayload.subscription_start_date = now;
    insertPayload.subscription_end_date = trialEnd.toISOString();
    insertPayload.subscription_status = 'active';
  }
  let result = await supabase.from(USERS_TABLE).insert(insertPayload).select().single();
  if (result.error) {
    const isMissingColumn =
      result.error.code === '42703' ||
      /column\s+.*\s+(does\s*not\s*exist|of\s+relation)/i.test(result.error.message || '');
    if (isMissingColumn && (roleVal === 'MERCHANT' || roleVal === 'BROKER')) {
      delete insertPayload.subscription_type;
      delete insertPayload.subscription_start_date;
      delete insertPayload.subscription_end_date;
      delete insertPayload.subscription_status;
      result = await supabase.from(USERS_TABLE).insert(insertPayload).select().single();
    }
  }
  const { data: user, error: insertError } = result;
  if (insertError) {
    logger.error('authService registerUser insert error', { message: insertError.message });
    return { user: null, error: insertError };
  }
  try {
    const sendResult = await verification.resendVerification(emailNorm);
    if (!sendResult.success) {
      console.warn('[authService] registerUser: resendVerification failed after register', sendResult.error?.message);
    }
  } catch (e) {
    console.warn('[authService] registerUser: resendVerification threw error', e?.message);
  }
  try {
    if (user?.id) {
      const { data: row, error: selErr } = await supabase
        .from(USERS_TABLE)
        .select('password')
        .eq('id', user.id)
        .single();
      if (selErr) {
        console.warn('[authService] registerUser: could not read password after insert:', selErr.message);
      } else if (row?.password?.startsWith('$2')) {
        const verifyMatch = await bcrypt.compare(passTrimmed, row.password);
        if (!verifyMatch) {
          console.warn('[authService] registerUser: password in DB but bcrypt.compare failed.');
        }
      }
    }
  } catch (e) {
    console.warn('[authService] registerUser: post-insert check failed', e?.message);
  }
  return { user, error: null, emailSent: true };
}
