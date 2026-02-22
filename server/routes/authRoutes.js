/**
 * Auth routes: registration (sends confirmation OTP), verify-email, forgot-password, reset-password, me.
 */

import express from 'express';
import * as authController from '../controllers/authController.js';
import { authLimiter } from '../middlewares/security.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(authLimiter());
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/register', authController.registerUser);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-verification', authController.resendVerification);

export default router;
