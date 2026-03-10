/**
 * Arabic Bank Payment Gateway API client.
 * Uses Axios; never logs or stores card data.
 */

import crypto from 'node:crypto';
import axios, { type AxiosInstance } from 'axios';
import type { CreateSessionBody, WebhookPayload } from '../types/index.js';
import { DEFAULT_CURRENCY, WEBHOOK_SIGNATURE_HEADER } from '../config/constants.js';

const TIMEOUT_MS = 15000;

export interface CreateSessionResult {
  redirectUrl?: string;
  paymentToken?: string;
  externalSessionId?: string;
}

export interface ArabicBankSessionResponse {
  redirectUrl?: string;
  paymentUrl?: string;
  paymentToken?: string;
  sessionId?: string;
  token?: string;
}

/**
 * Create a payment session with Arabic Bank.
 * Production: call bank API; here we simulate response shape if URL is mock.
 */
export async function createPaymentSession(
  config: { apiUrl: string; merchantId: string; secretKey: string },
  body: CreateSessionBody
): Promise<CreateSessionResult> {
  const client: AxiosInstance = axios.create({
    baseURL: config.apiUrl.replace(/\/$/, ''),
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = {
    merchantId: config.merchantId,
    orderId: body.orderId,
    amount: Number(body.amount),
    currency: body.currency || DEFAULT_CURRENCY,
    customerName: String(body.customerName).trim(),
    customerEmail: String(body.customerEmail).trim(),
    returnUrl: undefined as string | undefined,
    notifyUrl: undefined as string | undefined,
  };

  try {
    const response = await client.post<ArabicBankSessionResponse>('/v1/sessions', payload);
    const data = response.data || {};
    const redirectUrl = data.redirectUrl ?? data.paymentUrl;
    const paymentToken = data.paymentToken ?? data.token ?? data.sessionId;
    return {
      redirectUrl: typeof redirectUrl === 'string' ? redirectUrl : undefined,
      paymentToken: typeof paymentToken === 'string' ? paymentToken : undefined,
      externalSessionId: data.sessionId,
    };
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err)
      ? ((err.response?.data as { message?: string })?.message ?? err.message)
      : err instanceof Error
        ? err.message
        : 'Unknown error';
    console.error('[arabicBankService] createPaymentSession error:', msg);
    throw new Error(msg as string);
  }
}

/**
 * Verify webhook signature from Arabic Bank.
 * Uses HMAC-SHA256(secretKey, canonicalBody).
 */
export function verifyWebhookSignature(
  secretKey: string,
  rawBody: string | Buffer,
  signatureFromHeader: string
): boolean {
  if (!signatureFromHeader || !rawBody) return false;
  const hmac = crypto.createHmac('sha256', secretKey);
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  hmac.update(body);
  const expected = hmac.digest('hex');
  let received: Buffer;
  try {
    received = Buffer.from(signatureFromHeader.trim(), 'hex');
  } catch {
    return false;
  }
  const expectedBuf = Buffer.from(expected, 'hex');
  if (received.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(received, expectedBuf);
}

export function getSignatureHeaderName(): string {
  return WEBHOOK_SIGNATURE_HEADER;
}

/**
 * Normalize webhook payload for our order update.
 */
export function normalizeWebhookPayload(body: unknown): WebhookPayload | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const orderId = o.orderId ?? o.order_id;
  const transactionId = o.transactionId ?? o.transaction_id ?? o.referenceId ?? '';
  const status = (o.status ?? o.paymentStatus ?? o.result) as string | undefined;
  const amount = Number(o.amount ?? o.amount ?? 0);
  const currency = String(o.currency ?? '');
  const timestamp = String(o.timestamp ?? o.createdAt ?? '');
  if (!orderId || !status) return null;
  return {
    orderId: String(orderId),
    transactionId: String(transactionId),
    status: String(status).toLowerCase() === 'success' ? 'success' : 'failed',
    amount: Number.isNaN(amount) ? 0 : amount,
    currency: currency || 'JOD',
    timestamp,
    signature: o.signature as string | undefined,
  };
}
