/**
 * Payment status and API constants.
 */

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const DEFAULT_CURRENCY = 'JOD';

export const WEBHOOK_SIGNATURE_HEADER = 'x-arabic-bank-signature';
