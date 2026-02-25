/**
 * Auth routes: registration (sends confirmation OTP), verify-email, forgot-password, reset-password, me.
 */

import express from 'express';
import * as authController from '../controllers/authController.js';
import { authLimiter } from '../middlewares/security.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();
// للتأكد أن الطلبات تصل الباكند (لو ظهر 404 معناه السيرفر مش Node)
router.get('/ping', (req, res) => res.json({ ok: true, api: 'auth', message: 'Backend is Node.js' }));
// يوضح أي مفتاح Supabase يقرأه الباكند (service_role مطلوب لتسجيل الدخول)
router.get('/check-key', (req, res) => {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  let keyType = 'missing';
  if (key) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
      keyType = payload.role === 'service_role' ? 'service_role' : payload.role === 'anon' ? 'anon' : (payload.role || 'unknown');
    } catch (_) {
      keyType = 'invalid';
    }
  }
  res.json({ keyType, ok: keyType === 'service_role', message: keyType === 'service_role' ? 'المفتاح صحيح' : keyType === 'anon' ? 'غيّر إلى مفتاح service_role في Render' : 'ضبط SUPABASE_SERVICE_KEY في Render' });
});
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
