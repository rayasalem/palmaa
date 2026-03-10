/**
 * Auth password reset: forgot (send OTP), update (set new password after OTP).
 */

import { supabase } from '../../config/supabaseClient.js';
import * as emailService from '../emailService.js';
import * as otp from './otp.js';
import { hashPassword } from './utils.js';
import logger from '../../utils/logger.js';

const USERS_TABLE = 'users';
const EMAIL_SEND_TIMEOUT_MS = 25000;

export async function forgotPassword(email) {
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
  const code = otp.generateOtp();
  const { error: otpError } = await otp.saveOtp(emailNorm, code, 'password_reset');
  if (otpError) return { success: false, error: otpError };

  const html = emailService.getPasswordResetTemplate(code);
  const text = `Your password reset code is: ${code}. It expires in ${otp.OTP_EXPIRY_MINUTES} minutes.`;

  let emailResult;
  try {
    emailResult = await Promise.race([
      emailService.sendEmail(emailNorm, 'Password Reset Code', text, html),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), EMAIL_SEND_TIMEOUT_MS)),
    ]);
  } catch (err) {
    console.warn('[authService] forgotPassword: sendEmail error', err.message);
    return {
      success: false,
      error: {
        message:
          err.message === 'Email send timeout'
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
    logger.error('authService updatePassword error', { message: error.message });
    return { data: null, error };
  }
  return { data, error: null };
}
