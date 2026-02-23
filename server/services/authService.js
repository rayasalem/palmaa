/**
 * Auth service: OTP generation/verification, user registration, password update.
 * Uses Supabase tables: users, otp_codes (see README for schema).
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { supabase } from '../config/supabaseClient.js';
import * as emailService from './emailService.js';

const USERS_TABLE = 'users';
const OTP_TABLE = 'otp_codes';
const OTP_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 12;

/**
 * Generate a secure random 6-digit OTP (numeric only).
 * @returns {string} 6-digit code
 */
function generateOtp() {
  const n = crypto.randomInt(0, 1000000);
  return n.toString().padStart(6, '0');
}

/**
 * Save OTP to Supabase for given email and type. Sets expiration.
 * @param {string} email
 * @param {string} code - 6-digit OTP
 * @param {string} type - 'email_verification' | 'password_reset'
 * @returns {Promise<{ data: object | null, error: object | null }>}
 */
async function saveOtp(email, code, type) {
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

/**
 * Find valid OTP for email and type: not expired, not used (if you add a used column later).
 * Returns the row if valid.
 */
async function findValidOtp(email, code, type) {
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

/**
 * Invalidate OTP (e.g. after successful use). Deletes or marks used.
 */
async function invalidateOtp(email, type) {
  const emailNorm = email.toLowerCase().trim();
  await supabase.from(OTP_TABLE).delete().eq('email', emailNorm).eq('type', type);
  console.log('[authService] Invalidated OTP for', emailNorm, type);
}

/**
 * Verify OTP for email and type. Returns success and optionally invalidates.
 */
async function verifyOtp(email, otp, type, invalidateAfter = true) {
  const { data, error } = await findValidOtp(email, otp, type);
  if (error || !data) return { success: false, error: error || { message: 'Invalid or expired OTP' } };
  if (invalidateAfter) await invalidateOtp(email, type);
  return { success: true, error: null };
}

/**
 * Hash password with bcrypt.
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Update user password in Supabase by email. Caller must have verified OTP for password_reset.
 */
async function updatePassword(email, newPassword) {
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

/**
 * Register user: insert into users with is_email_verified=false, then generate OTP, save, send email.
 * @param {object} params - { email, password, name, role, termsAccepted, termsVersion }
 */
async function registerUser(params) {
  const { email, password, name, role, termsAccepted, termsVersion } = params;
  const emailNorm = email.toLowerCase().trim();
  const hashed = await hashPassword(password);
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
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    insertPayload.subscription_type = 'free';
    insertPayload.subscription_start_date = now;
    insertPayload.subscription_end_date = trialEnd.toISOString();
    insertPayload.subscription_status = 'active';
  }
  let result = await supabase.from(USERS_TABLE).insert(insertPayload).select().single();
  if (result.error) {
    const msg = (result.error.message || '').toLowerCase();
    const isMissingColumn = result.error.code === '42703' || /column\s+.*\s+(does\s*not\s*exist|of\s+relation)/i.test(result.error.message || '');
    if (isMissingColumn && roleVal === 'MERCHANT') {
      delete insertPayload.subscription_type;
      delete insertPayload.subscription_start_date;
      delete insertPayload.subscription_end_date;
      delete insertPayload.subscription_status;
      result = await supabase.from(USERS_TABLE).insert(insertPayload).select().single();
    }
  }
  const { data: user, error: insertError } = result;
  if (insertError) {
    console.error('[authService] registerUser insert error:', insertError.message);
    return { user: null, error: insertError };
  }
  const code = generateOtp();
  const { error: otpError } = await saveOtp(emailNorm, code, 'email_verification');
  if (otpError) {
    console.error('[authService] registerUser saveOtp error:', otpError.message);
    return { user, error: otpError };
  }
  const html = emailService.getEmailConfirmationTemplate(code);
  const emailResult = await emailService.sendEmail(
    emailNorm,
    'Email Confirmation Code',
    `Your verification code is: ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html
  );
  if (!emailResult.success) {
    console.error('[authService] registerUser sendEmail failed');
    return { user, error: emailResult.error || { message: 'Failed to send email' } };
  }
  return { user, error: null };
}

/**
 * Forgot password: ensure user exists, generate OTP, save, send email.
 */
async function forgotPassword(email) {
  const emailNorm = email.toLowerCase().trim();
  const { data: userRow, error: findError } = await supabase
    .from(USERS_TABLE)
    .select('id, email')
    .eq('email', emailNorm)
    .single();
  if (findError || !userRow) {
    console.log('[authService] forgotPassword: user not found', emailNorm);
    return { success: false, error: { message: 'No account found with this email' } };
  }
  const code = generateOtp();
  const { error: otpError } = await saveOtp(emailNorm, code, 'password_reset');
  if (otpError) return { success: false, error: otpError };
  const html = emailService.getPasswordResetTemplate(code);
  const emailResult = await emailService.sendEmail(
    emailNorm,
    'Password Reset Code',
    `Your password reset code is: ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html
  );
  if (!emailResult.success) {
    return { success: false, error: emailResult.error || { message: 'Failed to send email' } };
  }
  return { success: true, error: null };
}

/**
 * Set email_verified=true for user by email.
 * Updates both email_verified (base schema) and is_email_verified if it exists.
 */
async function setEmailVerified(email) {
  const emailNorm = email.toLowerCase().trim();
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({ email_verified: true, updated_at: new Date().toISOString() })
    .eq('email', emailNorm)
    .select()
    .single();
  if (error) {
    console.error('[authService] setEmailVerified error:', error.message);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Login: find user by email (case-insensitive), verify password with bcrypt, return user (no password).
 * Supports existing users with emails in any case; tries exact match first, then case-insensitive.
 */
async function login(email, password) {
  const emailNorm = email.toLowerCase().trim();
  if (!emailNorm || !password) {
    return { user: null, error: { message: 'Email and password are required' } };
  }

  // Try exact match first, then case-insensitive (for existing users with mixed-case emails)
  let userRow = null;
  let err = null;

  const selectCols = 'id, email, password, name, role, status, created_at, email_verified';
  const { data: exact, error: exactErr } = await supabase
    .from(USERS_TABLE)
    .select(selectCols)
    .eq('email', emailNorm)
    .maybeSingle();

  if (exact) {
    userRow = exact;
  } else if (exactErr || !exact) {
    // Try case-insensitive (for existing users with mixed-case emails)
    const { data: rows, error: listErr } = await supabase
      .from(USERS_TABLE)
      .select(selectCols)
      .ilike('email', emailNorm)
      .limit(1);
    if (!listErr && rows && rows.length > 0) userRow = rows[0];
  }

  if (!userRow || !userRow.password) {
    return { user: null, error: { message: 'Invalid credentials' } };
  }
  if (userRow.status === 'SUSPENDED') {
    return { user: null, error: { message: 'Account suspended. Contact support.' } };
  }

  // Handle legacy plain-text password (e.g. mock admin) - only for development
  const stored = userRow.password;
  let match = false;
  if (stored.startsWith('$2') && stored.length > 50) {
    match = await bcrypt.compare(password, stored);
  } else if (process.env.NODE_ENV !== 'production' && stored === password) {
    // Allow plain-text match only in development for backward compatibility
    match = true;
  }

  if (!match) {
    return { user: null, error: { message: 'Invalid credentials' } };
  }

  const { password: _, ...user } = userRow;
  user.is_email_verified = user.email_verified ?? user.is_email_verified ?? false;
  return { user, error: null };
}

/**
 * Resend email verification OTP for an existing (unverified) user.
 */
async function resendVerification(email) {
  const emailNorm = email.toLowerCase().trim();
  const { data: userRow, error: findError } = await supabase
    .from(USERS_TABLE)
    .select('id, email, email_verified')
    .eq('email', emailNorm)
    .maybeSingle();
  if (findError || !userRow) {
    return { success: false, error: { message: 'No account found with this email' } };
  }
  const verified = userRow.email_verified ?? false;
  if (verified) {
    return { success: false, error: { message: 'Email is already verified' } };
  }
  const code = generateOtp();
  const { error: otpError } = await saveOtp(emailNorm, code, 'email_verification');
  if (otpError) return { success: false, error: otpError };
  const html = emailService.getEmailConfirmationTemplate(code);
  const emailResult = await emailService.sendEmail(
    emailNorm,
    'Email Confirmation Code',
    `Your verification code is: ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html
  );
  if (!emailResult.success) {
    return { success: false, error: emailResult.error || { message: 'Failed to send email' } };
  }
  return { success: true, error: null };
}

/**
 * Get user by id (no password). For /api/auth/me and internal use.
 */
async function getUserById(userId) {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, name, role, status, phone, created_at, updated_at, email_verified')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[authService] getUserById error:', error.message);
    return { data: null, error };
  }
  if (data) data.is_email_verified = data.email_verified ?? data.is_email_verified ?? false;
  return { data, error: null };
}

export {
  generateOtp,
  saveOtp,
  findValidOtp,
  verifyOtp,
  invalidateOtp,
  hashPassword,
  updatePassword,
  login,
  registerUser,
  forgotPassword,
  setEmailVerified,
  resendVerification,
  getUserById,
};
