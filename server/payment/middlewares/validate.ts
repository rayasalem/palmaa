/**
 * Request validation middlewares.
 */

import type { Request, Response, NextFunction } from 'express';
import type { CreateSessionBody } from '../types/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateSession(
  req: Request<object, object, CreateSessionBody>,
  res: Response,
  next: NextFunction
): void {
  const body = req.body;
  const errors: string[] = [];

  if (!body?.orderId || String(body.orderId).trim() === '') {
    errors.push('orderId is required');
  }
  const amount = Number(body?.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    errors.push('amount must be a positive number');
  }
  if (!body?.customerName || String(body.customerName).trim() === '') {
    errors.push('customerName is required');
  }
  if (!body?.customerEmail || String(body.customerEmail).trim() === '') {
    errors.push('customerEmail is required');
  } else if (!EMAIL_REGEX.test(String(body.customerEmail).trim())) {
    errors.push('customerEmail must be a valid email');
  }
  if (body?.currency != null && String(body.currency).trim() === '') {
    errors.push('currency must be non-empty when provided');
  }

  if (errors.length > 0) {
    res.status(400).json({ success: false, error: errors.join('; ') });
    return;
  }
  next();
}
