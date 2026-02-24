/**
 * Checkout API client for backend (orders, payment, shipment).
 * Base URL: VITE_API_URL or https://palmaa.onrender.com
 */

import { getApiBase } from '../api/client';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers as object) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as any)?.error || (data as any)?.message || `HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data as T;
}

export interface CreateOrderBody {
  recipient_name: string;
  address: string;
  city: string;
  phone: string;
  amount: number;
  weight: number;
  /** عند الشراء عبر رابط الوسيط: يُمرَّر لاحتساب 3% للوسيط و 12% للمتجر */
  broker_id?: string;
  items?: { product_id: string; quantity: number; price: number }[];
}

export interface City {
  id: string;
  name: string;
  regionId?: string;
}

export interface Village {
  id: string;
  name: string;
  cityId?: string;
  regionId?: string;
}

export interface Order {
  id: string;
  status: string;
  amount?: number;
  recipient_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  weight?: number;
  shipment_id?: string;
  shipment_status?: string;
  updated_at?: string;
}

export interface CreateShipmentBody {
  orderId: string;
  addressLine1: string;
  addressLine2?: string;
  cityId: string;
  regionId?: string;
  villageId: string;
  recipient_name: string;
  phone: string;
  email?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  weight: number;
  cod: number;
  notes?: string;
  invoiceNumber?: string;
  quantity: number;
  description?: string;
  serviceType?: 'STANDARD' | 'EXPRESS' | 'SWAP' | 'BRING';
  shipmentType?: 'COD' | 'PREPAID' | 'SWAP' | 'BRING';
  toCollectFromReceiver?: number;
}

export async function createOrder(body: CreateOrderBody): Promise<{ success: boolean; order: Order }> {
  return request<{ success: boolean; order: Order }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getOrder(orderId: string): Promise<{ success: boolean; order: Order }> {
  return request<{ success: boolean; order: Order }>(`/api/orders/${orderId}`);
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean; order?: Order }> {
  return request<{ success: boolean; order?: Order }>(`/api/orders/${orderId}/cancel`, {
    method: 'PATCH',
  });
}

export async function fetchMyOrders(): Promise<{ success: boolean; orders: Order[] }> {
  return request<{ success: boolean; orders: Order[] }>('/api/orders');
}

export async function createPayment(
  orderId: string,
  amount: number,
  returnUrl: string
): Promise<{ success: boolean; paymentUrl: string; orderId: string; amount: number }> {
  return request<any>('/api/payment/create', {
    method: 'POST',
    body: JSON.stringify({ orderId, amount, return_url: returnUrl }),
  });
}

export async function createShipment(body: CreateShipmentBody): Promise<{
  success: boolean;
  order?: Order;
  shipment?: any;
  error?: string;
}> {
  return request<any>('/api/shipment/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getCities(): Promise<{ success: boolean; data: City[] }> {
  return request<{ success: boolean; data: City[] }>('/api/addresses/cities');
}

export async function getVillages(params: {
  search?: string;
  cityId?: string;
}): Promise<{ success: boolean; data: Village[] }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.cityId) query.set('cityId', params.cityId);
  const qs = query.toString();
  return request<{ success: boolean; data: Village[] }>(
    `/api/addresses/villages${qs ? `?${qs}` : ''}`
  );
}

export function printAWB(shipmentIds: string[]) {
  if (!shipmentIds || shipmentIds.length === 0) return;
  const content = `AWB for shipment(s):\\n${shipmentIds.join(', ')}`;
  const win = window.open('', '_blank', 'width=600,height=400');
  if (!win) return;
  win.document.write(`<pre style=\"font-family: monospace;\">${content}</pre>`);
  win.document.close();
  win.focus();
  win.print();
}
