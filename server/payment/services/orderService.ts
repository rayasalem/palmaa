/**
 * Order persistence for payment status. Uses Supabase.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PAYMENT_STATUS, type PaymentStatus } from '../config/constants.js';
import { ordersTable } from '../config/env.js';
import type { Order } from '../types/index.js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  _supabase = createClient(url, key);
  return _supabase;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(ordersTable).select('*').eq('id', orderId).single();
  if (error || !data) return null;
  return mapRowToOrder(data as Record<string, unknown>);
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<{ order: Order | null; error: string | null }> {
  const supabase = getSupabase();
  const updatedAt = new Date().toISOString();
  const updates: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: updatedAt,
  };
  if (paymentStatus === PAYMENT_STATUS.PAID || paymentStatus === PAYMENT_STATUS.FAILED) {
    updates.status = paymentStatus;
  }
  const { data, error } = await supabase
    .from(ordersTable)
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) {
    console.error('[orderService] updateOrderPaymentStatus:', error.message);
    return { order: null, error: error.message };
  }
  return { order: data ? mapRowToOrder(data as Record<string, unknown>) : null, error: null };
}

export async function setOrderPaidOrFailedIfPending(
  orderId: string,
  paymentStatus: 'paid' | 'failed'
): Promise<{ updated: boolean; order: Order | null; error: string | null }> {
  const existing = await getOrderById(orderId);
  if (!existing) return { updated: false, order: null, error: 'Order not found' };
  const row = existing as unknown as Record<string, unknown>;
  const current = (row.paymentStatus ?? row.payment_status) as string | undefined;
  if (current && current !== PAYMENT_STATUS.PENDING) {
    return { updated: false, order: existing, error: null };
  }
  const status = paymentStatus === 'paid' ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED;
  const { order, error } = await updateOrderPaymentStatus(orderId, status);
  return { updated: !error, order, error };
}

function mapRowToOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'JOD'),
    paymentStatus: (row.payment_status ?? row.paymentStatus ?? PAYMENT_STATUS.PENDING) as Order['paymentStatus'],
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ''),
  };
}
