/**
 * Auth routes: registration (sends confirmation OTP), verify-email, forgot-password, reset-password, me.
 */

import express from 'express';
import { getEnv, isProduction } from '../config/env.js';
import * as authController from '../controllers/authController.js';
import { authLimiter } from '../middlewares/security.js';
import { authenticate, optionalAuth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { auth as authSchemas } from '../validation/schemas.js';
import mfaRoutes from './mfaRoutes.js';

const router = express.Router();
// للتأكد أن الطلبات تصل الباكند (لو ظهر 404 معناه السيرفر مش Node)
router.get('/ping', (req, res) => res.json({ ok: true, api: 'auth', message: 'Backend is Node.js' }));
// يوضح أي مفتاح Supabase يقرأه الباكند. في الإنتاج معطّل إلا إذا ALLOW_AUTH_CHECK_KEY=true (لا تعرّض نوع المفتاح).
router.get('/check-key', (req, res) => {
  if (isProduction() && getEnv('ALLOW_AUTH_CHECK_KEY', 'false') !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  let keyType = 'missing';
  if (key) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
      keyType =
        payload.role === 'service_role' ? 'service_role' : payload.role === 'anon' ? 'anon' : payload.role || 'unknown';
    } catch (_) {
      keyType = 'invalid';
    }
  }
  res.json({
    keyType,
    ok: keyType === 'service_role',
    message:
      keyType === 'service_role'
        ? 'المفتاح صحيح'
        : keyType === 'anon'
          ? 'غيّر إلى مفتاح service_role في Render'
          : 'ضبط SUPABASE_SERVICE_KEY في Render',
  });
});
router.use(authLimiter());
router.post('/login', validate(authSchemas.login, 'body', 'auth.login'), asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.post('/logout-all', authenticate, asyncHandler(authController.logoutAll));
router.get('/me', optionalAuth, asyncHandler(authController.getMe));
router.post('/register', validate(authSchemas.register, 'body', 'auth.register'), asyncHandler(authController.registerUser));
router.post('/verify-email', validate(authSchemas.verifyEmail, 'body', 'auth.verifyEmail'), asyncHandler(authController.verifyEmail));
router.post(
  '/forgot-password',
  validate(authSchemas.forgotPassword, 'body', 'auth.forgotPassword'),
  asyncHandler(authController.forgotPassword)
);
router.post(
  '/reset-password',
  validate(authSchemas.resetPassword, 'body', 'auth.resetPassword'),
  asyncHandler(authController.resetPassword)
);
router.post(
  '/resend-verification',
  validate(authSchemas.resendVerification, 'body', 'auth.resendVerification'),
  asyncHandler(authController.resendVerification)
);

router.use('/mfa', mfaRoutes);

export default router;
