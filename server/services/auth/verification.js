/**
 * Auth verification: set email verified, resend verification OTP.
 */

import { supabase } from '../../config/supabaseClient.js';
import * as emailService from '../emailService.js';
import * as otp from './otp.js';
import logger from '../../utils/logger.js';

const USERS_TABLE = 'users';

export async function setEmailVerified(email) {
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

export async function resendVerification(email) {
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
  const code = otp.generateOtp();
  const { error: otpError } = await otp.saveOtp(emailNorm, code, 'email_verification');
  if (otpError) return { success: false, error: otpError };
  const html = emailService.getEmailConfirmationTemplate(code);
  const emailResult = await emailService.sendEmail(
    emailNorm,
    'Email Confirmation Code',
    `Your verification code is: ${code}. It expires in ${otp.OTP_EXPIRY_MINUTES} minutes.`,
    html
  );
  if (!emailResult.success) {
    return { success: false, error: emailResult.error || { message: 'Failed to send email' } };
  }
  return { success: true, error: null };
}
