/**
 * Arabic Bank payment controller: create-session and webhook.
 */

import type { Request, Response } from 'express';
import { getArabicBankConfig } from '../config/env.js';
import { createPaymentSession, normalizeWebhookPayload } from '../services/arabicBankService.js';
import { setOrderPaidOrFailedIfPending } from '../services/orderService.js';
import * as mainOrderService from '../../services/orderService.js';
import * as productService from '../../services/productService.js';
import type { CreateSessionBody, CreateSessionResponse } from '../types/index.js';

export async function createSession(req: Request<object, object, CreateSessionBody>, res: Response): Promise<void> {
  try {
    const config = getArabicBankConfig();
    if (!config) {
      res.status(503).json({ success: false, error: 'Payment gateway not configured' });
      return;
    }
    const body = req.body;
    const result = await createPaymentSession(config, {
      orderId: String(body.orderId).trim(),
      amount: Number(body.amount),
      currency: body.currency?.trim() || undefined,
      customerName: String(body.customerName).trim(),
      customerEmail: String(body.customerEmail).trim(),
    });
    const response: CreateSessionResponse = {
      success: true,
      orderId: body.orderId,
      redirectUrl: result.redirectUrl,
      paymentToken: result.paymentToken,
    };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create payment session';
    console.error('[paymentController] createSession:', message);
    res.status(500).json({ success: false, error: message, orderId: req.body?.orderId });
  }
}

export async function webhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = normalizeWebhookPayload(req.body);
    if (!payload) {
      res.status(400).json({ success: false, error: 'Invalid webhook payload' });
      return;
    }
    const { updated, order, error } = await setOrderPaidOrFailedIfPending(
      payload.orderId,
      payload.status === 'success' ? 'paid' : 'failed'
    );
    if (error && !order) {
      res.status(500).json({ success: false, error });
      return;
    }
    if (updated && payload.status === 'success') {
      const { data: orderWithItems } = await mainOrderService.getOrderById(payload.orderId);
      const items = orderWithItems?.items ?? [];
      for (const it of items) {
        const productId = (it as { product_id?: string; productId?: string }).product_id ?? (it as { productId?: string }).productId;
        const qty = Number((it as { quantity?: number }).quantity) || 1;
        if (productId) {
          await productService.decrementStock(productId, qty);
        }
      }
    }
    res.status(200).json({
      success: true,
      processed: updated,
      orderId: payload.orderId,
      status: payload.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error('[paymentController] webhook:', message);
    res.status(500).json({ success: false, error: message });
  }
}
