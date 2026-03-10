/**
 * Arabic Bank payment routes: create-session, webhook.
 */

import express from 'express';
import { validateCreateSession } from '../middlewares/validate.js';
import { rawBodyMiddleware } from '../middlewares/rawBody.js';
import { verifyArabicBankWebhook } from '../middlewares/verifySignature.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-session', express.json(), validateCreateSession, paymentController.createSession);

router.post(
  '/webhook',
  express.json({ verify: rawBodyMiddleware }),
  verifyArabicBankWebhook,
  paymentController.webhook
);

export default router;
