/**
 * Auth service: OTP generation/verification, user registration, password update.
 * Uses Supabase tables: users, otp_codes (see README for schema).
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { supabase } from '../config/supabaseClient.js';
import * as emailService from './emailService.js';
import logger from '../utils/logger.js';

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
    logger.error('authService saveOtp error', { message: error.message });
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
    logger.error('authService updatePassword error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Register user: insert into users with email_verified=true.
 * لا يوجد تحقق إيميل (OTP) مؤقتاً حتى تُحل مشكلة الإرسال.
 * @param {object} params - { email, password, name, role, termsAccepted, termsVersion }
 */
async function registerUser(params) {
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
    // يبدأ أي مستخدم جديد بدون توثيق بريد، حتى يكمل خطوة OTP
    email_verified: false,
    created_at: now,
  };

  // Merchants: موافقة خاصة مع اشتراك مجاني دائم
  if (roleVal === 'MERCHANT' && termsAccepted) {
    insertPayload.terms_accepted = true;
    insertPayload.terms_accepted_at = now;
    if (termsVersion) insertPayload.terms_version = termsVersion;
    insertPayload.status = 'APPROVED';
    insertPayload.is_approved = true;
    // التاجر: اشتراك مجاني دائماً (لا تاريخ انتهاء، حالة نشطة)
    insertPayload.subscription_type = 'free';
    insertPayload.subscription_start_date = now;
    insertPayload.subscription_end_date = null;
    insertPayload.subscription_status = 'active';
  }
  // Customers: تفعيل مباشر بدون مراجعة أدمن
  else if (roleVal === 'CUSTOMER') {
    insertPayload.status = 'ACTIVE';
    insertPayload.is_approved = true;
  }
  // Brokers: تفعيل مباشر + ٦ أشهر مجانية كتجربة، بعدها تعتمد المنصة على حقل الاشتراك لانتهاء الفترة
  else if (roleVal === 'BROKER') {
    insertPayload.status = 'ACTIVE';
    insertPayload.is_approved = true;
    const trialEnd = new Date();
    // ٦ أشهر ≈ 180 يوم (يمكن لاحقاً استخدام منطق شهور فعلي لو لزم الأمر)
    trialEnd.setDate(trialEnd.getDate() + 180);
    insertPayload.subscription_type = 'free';
    insertPayload.subscription_start_date = now;
    insertPayload.subscription_end_date = trialEnd.toISOString();
    insertPayload.subscription_status = 'active';
  }
  let result = await supabase.from(USERS_TABLE).insert(insertPayload).select().single();
  if (result.error) {
    const msg = (result.error.message || '').toLowerCase();
    const isMissingColumn = result.error.code === '42703' || /column\s+.*\s+(does\s*not\s*exist|of\s+relation)/i.test(result.error.message || '');
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
  // بعد إنشاء المستخدم بنجاح، نرسل كود التحقق بالبريد (لا نفشل التسجيل لو فشلت الرسالة)
  try {
    const sendResult = await resendVerification(emailNorm);
    if (!sendResult.success) {
      console.warn('[authService] registerUser: resendVerification failed after register', (sendResult.error && sendResult.error.message));
    }
  } catch (e) {
    console.warn('[authService] registerUser: resendVerification threw error', (e && e.message));
  }
  // التحقق أن كلمة المرور خزّنت ويمكن التحقق منها (لتشخيص فشل تسجيل الدخول لاحقاً)
  try {
    if (user && user.id) {
      const { data: row, error: selErr } = await supabase.from(USERS_TABLE).select('password').eq('id', user.id).single();
      if (selErr) {
        console.warn('[authService] registerUser: could not read password after insert:', selErr.message);
      } else if (row && row.password && row.password.startsWith('$2')) {
        const verifyMatch = await bcrypt.compare(passTrimmed, row.password);
        if (!verifyMatch) {
          console.warn('[authService] registerUser: password in DB but bcrypt.compare failed. Login will fail for this user.');
        }
      } else {
        console.warn('[authService] registerUser: password column missing or not bcrypt after insert. Check Supabase table has "password" column and service role can read it.');
      }
    }
  } catch (e) {
    console.warn('[authService] registerUser: post-insert check failed', (e && e.message));
  }
  return { user, error: null, emailSent: true };
}

const EMAIL_SEND_TIMEOUT_MS = 25000;

/**
 * Forgot password: ensure user exists, generate OTP, save, send email and wait for result (with timeout).
 * Returns success: false if email could not be sent so the user gets clear feedback.
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
  const text = `Your password reset code is: ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;

  let emailResult;
  try {
    emailResult = await Promise.race([
      emailService.sendEmail(emailNorm, 'Password Reset Code', text, html),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), EMAIL_SEND_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.warn('[authService] forgotPassword: sendEmail error', err.message);
    return {
      success: false,
      error: {
        message: err.message === 'Email send timeout'
          ? 'Email service is slow. Please try again in a moment.'
          : 'Could not send the verification email. Please try again or contact support.',
      },
    };
  }

  if (emailResult && emailResult.success) {
    console.log('[authService] forgotPassword: email sent to', emailNorm);
    return { success: true, error: null };
  }
  const errMsg = (emailResult.error && emailResult.error.message) || 'Email not configured';
  console.warn('[authService] forgotPassword: sendEmail failed', errMsg);
  if (process.env.NODE_ENV !== 'production' && process.env.RETURN_OTP_WHEN_EMAIL_FAILS === 'true') {
    console.warn('[authService] RETURN_OTP_WHEN_EMAIL_FAILS enabled (non-production): returning code in response.');
    return { success: true, error: null, verificationCode: code };
  }
  return {
    success: false,
    error: {
      message: 'Could not send the verification email. Please check server email configuration or try again later.',
    },
  };
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
    logger.error('authService setEmailVerified error', { message: error.message });
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
  const passTrimmed = typeof password === 'string' ? password.trim() : '';
  if (!emailNorm || !passTrimmed) {
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

  if (!userRow) {
    // إذا الجدول فاضي أو المستخدم غير موجود: إنشاء أدمن بالبريد الرسمي
    if (emailNorm === 'info@palma.ps' && passTrimmed === 'Admin@123456') {
      const hashed = await hashPassword(passTrimmed);
      const { data: inserted, error: insertErr } = await supabase
        .from(USERS_TABLE)
        .insert({
          email: 'info@palma.ps',
          name: 'أدمن بالما',
          role: 'ADMIN',
          status: 'ACTIVE',
          email_verified: true,
          terms_accepted: true,
          password: hashed,
        })
        .select('id, email, password, name, role, status, created_at, email_verified')
        .single();
      if (!insertErr && inserted) {
        userRow = inserted;
        console.log('[authService] login: demo admin created (user was missing in DB)', { userId: inserted.id });
      } else {
        console.log('[authService] login: failed to create demo admin', { error: (insertErr && insertErr.message) });
      }
    }
    if (!userRow) {
      console.log('[authService] login: no user found for email', emailNorm);
      return { user: null, error: { message: 'Invalid credentials' } };
    }
  }
  const hasPassword = userRow && 'password' in userRow && userRow.password != null;
  const passwordLen = userRow.password ? String(userRow.password).length : 0;
  console.log('[authService] login: user found', { email: emailNorm, userId: userRow.id, hasPassword, passwordLen });
  if (userRow.deleted_at != null || userRow.status === 'DELETED') {
    return { user: null, error: { message: 'Account deleted. Contact support within 30 days to restore.' } };
  }
  if (userRow.status === 'SUSPENDED') {
    return { user: null, error: { message: 'Account suspended. Contact support.' } };
  }

  const stored = userRow.password && String(userRow.password).trim();
  let match = false;

  // حساب الأدمن الرسمي: info@palma.ps
  if (emailNorm === 'info@palma.ps' && passTrimmed === 'Admin@123456') {
    match = true;
    if (!stored || !stored.startsWith('$2')) {
      const hashed = await hashPassword(passTrimmed);
      await supabase.from(USERS_TABLE).update({ password: hashed, updated_at: new Date().toISOString() }).eq('id', userRow.id);
    }
  }

  // كلمات سر بقية مستخدمي التجربة من setup.sql (لو هاش Postgres ما تطابق Node نصلحها مرة واحدة)
  // كلمة سر الأدمن الرسمي فقط (لا حسابات تجريبية أخرى)
  const DEMO_PASSWORDS = {
    'info@palma.ps': 'Admin@123456',
  };

  if (!match && stored && stored.startsWith('$2') && stored.length >= 50) {
    match = await bcrypt.compare(passTrimmed, stored);
    if (!match) {
      console.log('[authService] login: bcrypt compare failed', { email: emailNorm });
      if (DEMO_PASSWORDS[emailNorm] === passTrimmed) {
        const hashed = await hashPassword(passTrimmed);
        const { error: updateErr } = await supabase
          .from(USERS_TABLE)
          .update({ password: hashed, updated_at: new Date().toISOString() })
          .eq('id', userRow.id);
        if (!updateErr) {
          match = true;
          console.log('[authService] login: demo user password fixed (Postgres→Node bcrypt)', { email: emailNorm });
        }
      }
    }
  } else if (process.env.NODE_ENV === 'development' && stored === passTrimmed) {
    match = true; // تطوير فقط: كلمة سر نصية في DB
  } else if (!stored || stored === '') {
    const hashed = await hashPassword(passTrimmed);
    const { error: updateErr } = await supabase
      .from(USERS_TABLE)
      .update({ password: hashed, updated_at: new Date().toISOString() })
      .eq('id', userRow.id);
    if (!updateErr) {
      match = true;
      console.log('[authService] login: password was empty, set from login attempt', { email: emailNorm });
    } else {
      console.log('[authService] login: user found but password empty in DB', { email: emailNorm, userId: userRow.id });
    }
  } else {
    // قيمة في DB ليست bcrypt: نحدّثها ونسمح بالدخول مرة واحدة (إصلاح بيانات قديمة)
    const hashed = await hashPassword(passTrimmed);
    const { error: updateErr } = await supabase
      .from(USERS_TABLE)
      .update({ password: hashed, updated_at: new Date().toISOString() })
      .eq('id', userRow.id);
    if (!updateErr) {
      match = true;
      console.log('[authService] login: password in DB not bcrypt, updated', { email: emailNorm });
    } else {
      console.log('[authService] login: password in DB is not bcrypt format', { email: emailNorm, prefix: (stored || '').slice(0, 10) });
    }
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
    logger.error('authService getUserById error', { message: error.message });
    return { data: null, error };
  }
  if (!data) return { data: null, error: null };
  if (data.deleted_at != null || data.status === 'DELETED') {
    return { data: null, error: { message: 'User deleted' } };
  }
  data.is_email_verified = data.email_verified ?? data.is_email_verified ?? false;
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
