/**
 * Auth routes: mounts POST/GET handlers for /api/auth/*.
 * Uses authLimiter and authenticate middleware from server middlewares.
 */

import express from 'express';
import { authLimiter } from '../middlewares/security.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as authController from './controllers/index.js';

const router = express.Router();

// Apply rate limit to all auth routes
router.use(authLimiter());

// POST /api/auth/login – body: email, password
router.post('/login', authController.login);
// POST /api/auth/logout – clears JWT cookie
router.post('/logout', authController.logout);
// GET /api/auth/me – returns current user (protected)
router.get('/me', authenticate, authController.getMe);
// POST /api/auth/register – body: email, password, name?, role?, termsAccepted?, termsVersion?
router.post('/register', authController.registerUser);
// POST /api/auth/verify-email – body: email, otp
router.post('/verify-email', authController.verifyEmail);
// POST /api/auth/forgot-password – body: email
router.post('/forgot-password', authController.forgotPassword);
// POST /api/auth/reset-password – body: email, otp, newPassword
router.post('/reset-password', authController.resetPassword);
// POST /api/auth/resend-verification – body: email
router.post('/resend-verification', authController.resendVerification);

export default router;
