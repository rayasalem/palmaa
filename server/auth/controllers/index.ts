/**
 * Auth controllers: HTTP handlers for /api/auth/*.
 * Each handler validates input, calls authService (JS), and returns typed JSON.
 */

import type { Request, Response } from 'express';
import * as authService from '../../services/authService.js';
import * as jwtService from '../../services/jwtService.js';
import logger from '../../utils/logger.js';
import type {
  RegisterBody,
  VerifyEmailBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  ResendVerificationBody,
  AuthUserResponse,
} from '../../types/index.js';

// ---------------------------------------------------------------------------
// GET /api/auth/me (protected)
// ---------------------------------------------------------------------------

/**
 * Returns the current user from JWT. req.auth is set by authenticate middleware.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const { data: user, error } = await authService.getUserById(userId);
    if (error || !user) {
      res.status(404).json({ success: false, error: (error as { message?: string })?.message || 'User not found' });
      return;
    }
    const payload: AuthUserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_email_verified: user.is_email_verified,
      status: user.status,
      phone: user.phone,
      created_at: user.created_at,
    };
    res.status(200).json({ success: true, user: payload });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error('getMe unexpected', { message });
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

/**
 * Body: email, password. Validates input, calls authService.login, sets JWT cookie, returns user.
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ success: false, error: 'Password is required' });
      return;
    }
    const { user, error } = await authService.login(email.trim().toLowerCase(), password);
    if (error || !user) {
      res.status(401).json({ success: false, error: (error as { message?: string })?.message || 'Invalid credentials' });
      return;
    }
    const token = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    res.cookie(jwtService.getCookieName(), token, jwtService.getCookieOptions());
    logger.info('login success', { userId: user.id, role: user.role });
    const payload: AuthUserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_email_verified: user.is_email_verified,
      status: user.status,
    };
    res.status(200).json({ success: true, user: payload, message: 'Logged in' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error('login unexpected', { message });
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

/**
 * Clears the JWT cookie.
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(jwtService.getCookieName(), { path: '/' });
  res.status(200).json({ success: true, message: 'Logged out' });
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

/**
 * Body: email, password, name?, role?, termsAccepted?, termsVersion?.
 * For MERCHANT role, termsAccepted is required.
 */
export async function registerUser(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Partial<RegisterBody>;
    const { email, password, name, role, termsAccepted, termsVersion } = body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password is required and must be at least 6 characters' });
      return;
    }
    const roleNorm = role ? String(role).trim().toUpperCase() : 'CUSTOMER';
    if (roleNorm === 'MERCHANT' && !termsAccepted) {
      res.status(400).json({ success: false, error: 'Merchants must accept the Terms and Conditions' });
      return;
    }
    const emailNorm = email.toLowerCase().trim();
    logger.info('registerUser', { email: emailNorm, role: roleNorm });
    const { user, error } = await authService.registerUser({
      email: emailNorm,
      password,
      name: name ? String(name).trim() : undefined,
      role: roleNorm,
      termsAccepted: roleNorm === 'MERCHANT' ? true : !!termsAccepted,
      termsVersion: termsVersion ? String(termsVersion).trim() : undefined,
    });
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ success: false, error: 'An account with this email already exists' });
        return;
      }
      logger.warn('registerUser error', { error: (error as { message?: string }).message });
      res.status(500).json({ success: false, error: (error as { message?: string }).message || 'Registration failed' });
      return;
    }
    res.status(201).json({
      success: true,
      message: 'Check your email for OTP to verify your account.',
      user: user ? { id: user.id, email: user.email, role: user.role, is_email_verified: user.is_email_verified } : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error('registerUser unexpected', { message });
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-email
// ---------------------------------------------------------------------------

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body as Partial<VerifyEmailBody>;
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }
    if (!otp || String(otp).trim().length !== 6) {
      res.status(400).json({ success: false, error: 'Valid 6-digit OTP is required' });
      return;
    }
    logger.info('verifyEmail', { email: email.trim().toLowerCase() });
    const verifyResult = await authService.verifyOtp(email, String(otp).trim(), 'email_verification', true);
    if (!verifyResult.success) {
      res.status(400).json({ success: false, error: (verifyResult.error as { message?: string })?.message || 'Invalid or expired OTP' });
      return;
    }
    const { data: user, error } = await authService.setEmailVerified(email);
    if (error) {
      res.status(500).json({ success: false, error: (error as { message?: string }).message || 'Failed to update verification status' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      user: user ? { id: user.id, email: user.email, name: user.name, role: user.role, is_email_verified: user.is_email_verified, status: user.status, created_at: user.created_at, phone: user.phone } : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error('verifyEmail unexpected', { message });
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as Partial<ForgotPasswordBody>;
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }
    logger.info('forgotPassword', { email: email.trim().toLowerCase() });
    const result = await authService.forgotPassword(email);
    if (!result.success) {
      res.status(400).json({ success: false, error: (result.error as { message?: string })?.message || 'Request failed' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'If an account exists for this email, you will receive a password reset code.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error('forgotPassword unexpected', { message });
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp, newPassword } = req.body as Partial<ResetPasswordBody>;
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }
    if (!otp || String(otp).trim().length !== 6) {
      res.status(400).json({ success: false, error: 'Valid 6-digit OTP is required' });
      return;
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
      return;
    }
    logger.info('resetPassword', { email: email.trim().toLowerCase() });
    const verifyResult = await authService.verifyOtp(email, String(otp).trim(), 'password_reset', true);
    if (!verifyResult.success) {
      res.status(400).json({ success: false, error: (verifyResult.error as { message?: string })?.message || 'Invalid or expired OTP' });
      return;
    }
    const { error } = await authService.updatePassword(email, newPassword);
    if (error) {
      res.status(500).json({ success: false, error: (error as { message?: string }).message || 'Failed to update password' });
      return;
    }
    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error('resetPassword unexpected', { message });
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/resend-verification
// ---------------------------------------------------------------------------

export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as Partial<ResendVerificationBody>;
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }
    const result = await authService.resendVerification(email);
    if (!result.success) {
      res.status(400).json({ success: false, error: (result.error as { message?: string })?.message || 'Request failed' });
      return;
    }
    res.status(200).json({ success: true, message: 'Verification code sent.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error('resendVerification unexpected', { message });
    res.status(500).json({ success: false, error: message });
  }
}
