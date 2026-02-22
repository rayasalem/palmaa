/**
 * Webhook signature verification.
 * Requires raw body to be attached by express.raw or custom middleware for webhook route.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature, getSignatureHeaderName } from '../services/arabicBankService.js';
import { getArabicBankConfig } from '../config/env.js';

export function verifyArabicBankWebhook(req: Request, res: Response, next: NextFunction): void {
  const config = getArabicBankConfig();
  if (!config) {
    res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    return;
  }
  const headerName = getSignatureHeaderName();
  const signature = (req.headers[headerName] ?? req.headers[headerName.toLowerCase()]) as string | undefined;
  if (!signature) {
    res.status(401).json({ success: false, error: 'Missing signature' });
    return;
  }
  const rawBody = (req as Request & { rawBody?: Buffer | string }).rawBody;
  if (rawBody == null) {
    res.status(500).json({ success: false, error: 'Raw body required for signature verification' });
    return;
  }
  const valid = verifyWebhookSignature(config.secretKey, rawBody, signature);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid signature' });
    return;
  }
  next();
}
