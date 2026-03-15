/**
 * MFA routes: setup, verify-setup, challenge (handled in login), verify.
 * All require authentication except verify (uses mfaChallengeToken).
 */

import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { mfa as mfaSchemas } from '../validation/schemas.js';
import * as mfaController from '../controllers/mfaController.js';

const router = express.Router();

router.get('/status', authenticate, asyncHandler(mfaController.status));
router.post('/setup', authenticate, asyncHandler(mfaController.setup));
router.post(
  '/verify-setup',
  authenticate,
  validate(mfaSchemas.verifySetup, 'body', 'mfa.verifySetup'),
  asyncHandler(mfaController.verifySetup)
);
router.post('/verify', validate(mfaSchemas.verify, 'body', 'mfa.verify'), asyncHandler(mfaController.verify));
router.post('/disable', authenticate, asyncHandler(mfaController.disable));

export default router;
