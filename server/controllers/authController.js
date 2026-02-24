/**
 * Auth controller: login, registration (sends OTP), verify-email, forgot-password, reset-password, me.
 * All endpoints validate input and use try/catch with logging.
 */

import * as authService from '../services/authService.js';
import * as jwtService from '../services/jwtService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/auth/me (protected)
 * Returns current user from JWT. req.auth set by authenticate middleware.
 */
async function getMe(req, res) {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { data: user, error } = await authService.getUserById(userId);
    if (error || !user) {
      return res.status(404).json({ success: false, error: error?.message || 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_email_verified: user.is_email_verified,
        status: user.status,
        phone: user.phone,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    logger.error('getMe unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * POST /api/auth/login
 * Body: email, password. Returns user and sets httpOnly cookie with JWT.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }
    const passTrimmed = typeof password === 'string' ? password.trim() : '';
    const { user, error } = await authService.login(email.trim().toLowerCase(), passTrimmed);
    if (error || !user) {
      logger.warn('login failed', { email: email.trim().toLowerCase(), reason: error?.message || 'no user' });
      return res.status(401).json({ success: false, error: error?.message || 'Invalid credentials' });
    }
    const token = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    res.cookie(jwtService.getCookieName(), token, jwtService.getCookieOptions());
    logger.info('login success', { userId: user.id, role: user.role });
    return res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, is_email_verified: user.is_email_verified, status: user.status },
      message: 'Logged in',
    });
  } catch (err) {
    logger.error('login unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * POST /api/auth/logout
 * Clears JWT cookie.
 */
async function logout(req, res) {
  res.clearCookie(jwtService.getCookieName(), { path: '/' });
  return res.status(200).json({ success: true, message: 'Logged out' });
}

/**
 * POST /api/auth/register
 * Body: email, password, name (optional), role (optional).
 * Inserts user with is_email_verified=false, generates 6-digit OTP, saves to Supabase, sends "Email Confirmation Code" email.
 */
async function registerUser(req, res) {
  try {
    const { email, password, name, role, termsAccepted, termsVersion } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password is required and must be at least 6 characters' });
    }
    const roleNorm = role ? String(role).trim().toUpperCase() : 'CUSTOMER';
    if (roleNorm === 'MERCHANT' && !termsAccepted) {
      return res.status(400).json({ success: false, error: 'Merchants must accept the Terms and Conditions' });
    }
    const emailNorm = email.toLowerCase().trim();
    logger.info('registerUser', { email: emailNorm, role: roleNorm });
    const { user, error, emailSent, verificationCode } = await authService.registerUser({
      email: emailNorm,
      password: typeof password === 'string' ? password.trim() : password,
      name: name ? String(name).trim() : undefined,
      role: roleNorm,
      termsAccepted: roleNorm === 'MERCHANT' ? true : !!termsAccepted,
      termsVersion: termsVersion ? String(termsVersion).trim() : undefined,
    });
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'An account with this email already exists' });
      }
      logger.warn('registerUser error', { error: error.message });
      const msg = (error.message || '').toLowerCase();
      const isDbSetup = /relation|otp_codes|column|does not exist|syntax/.test(msg);
      const userMsg = isDbSetup
        ? 'إعداد قاعدة البيانات ناقص. شغّل سكربت الإعداد (setup.sql) في Supabase SQL Editor ثم أعد المحاولة.'
        : (error.message || 'Registration failed');
      return res.status(500).json({ success: false, error: userMsg });
    }
    // نفس تسجيل الدخول: نضع كوكي الجلسة (JWT) عشان بعد التسجيل المستخدم يكون "داخل" وما يحتاج يعمل login مرة ثانية
    if (user && user.id) {
      const token = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
      res.cookie(jwtService.getCookieName(), token, jwtService.getCookieOptions());
      logger.info('registerUser: session cookie set', { userId: user.id, role: user.role });
    }
    const payload = {
      success: true,
      message: emailSent !== false
        ? 'Check your email for OTP to verify your account.'
        : 'Account created. Email is not configured; use the code below to verify.',
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            is_email_verified: user.is_email_verified,
          }
        : null,
      emailSent: emailSent !== false,
    };
    if (verificationCode) payload.verificationCode = verificationCode;
    return res.status(201).json(payload);
  } catch (err) {
    logger.error('registerUser unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * POST /api/auth/verify-email
 * Body: email, otp (6-digit code).
 * Verifies OTP and expiration, then sets is_email_verified=true for the user.
 */
async function verifyEmail(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ success: false, error: 'Valid 6-digit OTP is required' });
    }
    logger.info('verifyEmail', { email: email.trim().toLowerCase() });
    const verifyResult = await authService.verifyOtp(email, String(otp).trim(), 'email_verification', true);
    if (!verifyResult.success) {
      return res.status(400).json({ success: false, error: verifyResult.error?.message || 'Invalid or expired OTP' });
    }
    const { data: user, error } = await authService.setEmailVerified(email);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to update verification status' });
    }
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      user: user ? { id: user.id, email: user.email, name: user.name, role: user.role, is_email_verified: user.is_email_verified, status: user.status, created_at: user.created_at, phone: user.phone } : null,
    });
  } catch (err) {
    logger.error('verifyEmail unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: email.
 * Verifies email exists, generates 6-digit OTP, saves with expiration, sends "Password Reset Code" email.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    logger.info('forgotPassword', { email: email.trim().toLowerCase() });
    const result = await authService.forgotPassword(email);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error?.message || 'Request failed' });
    }
    const payload = {
      success: true,
      message: 'If an account exists for this email, you will receive a password reset code.',
    };
    if (result.verificationCode) {
      payload.verificationCode = result.verificationCode;
    }
    return res.status(200).json(payload);
  } catch (err) {
    logger.error('forgotPassword unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * POST /api/auth/reset-password
 * Body: email, otp, newPassword.
 * Verifies OTP and expiration, hashes new password with bcrypt, updates user in Supabase, invalidates OTP.
 */
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ success: false, error: 'Valid 6-digit OTP is required' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }
    logger.info('resetPassword', { email: email.trim().toLowerCase() });
    const verifyResult = await authService.verifyOtp(email, String(otp).trim(), 'password_reset', true);
    if (!verifyResult.success) {
      return res.status(400).json({ success: false, error: verifyResult.error?.message || 'Invalid or expired OTP' });
    }
    const { data, error } = await authService.updatePassword(email, newPassword);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to update password' });
    }
    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (err) {
    logger.error('resetPassword unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * POST /api/auth/resend-verification
 * Body: email. Resends email verification OTP for existing unverified user.
 */
async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const result = await authService.resendVerification(email);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error?.message || 'Request failed' });
    }
    return res.status(200).json({ success: true, message: 'Verification code sent.' });
  } catch (err) {
    logger.error('resendVerification unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export {
  login,
  logout,
  registerUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  getMe,
};
