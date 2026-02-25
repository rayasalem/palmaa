/**
 * Shipment API: create, status, cancel via backend /api/shipment (LogesTechs).
 * Uses credentials: 'include' for auth.
 */

import { api } from '../api/client';

export interface CreateShipmentPayload {
  orderId: string;
  addressLine1: string;
  addressLine2?: string;
  cityId: number;
  regionId?: number;
  villageId: number;
  recipient_name: string;
  phone: string;
  email?: string;
  weight: number;
  cod?: number;
  quantity?: number;
  notes?: string;
  description?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  invoiceNumber?: string;
  serviceType?: string;
  shipmentType?: string;
  toCollectFromReceiver?: number;
}

export interface CreateShipmentResponse {
  success: boolean;
  order?: Record<string, unknown>;
  shipment?: { id?: string; status?: string; barcode?: string };
  message?: string;
  error?: string;
}

export interface ShipmentStatusResponse {
  success: boolean;
  status?: unknown;
  error?: string;
}

export interface CancelShipmentResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}

export async function createShipmentApi(payload: CreateShipmentPayload): Promise<CreateShipmentResponse> {
  const data = await api<CreateShipmentResponse>('/api/shipment/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
}

export async function getShipmentStatusApi(params: { id?: string; barcode?: string }): Promise<ShipmentStatusResponse> {
  const q = new URLSearchParams();
  if (params.id) q.set('id', params.id);
  if (params.barcode) q.set('barcode', params.barcode);
  const data = await api<ShipmentStatusResponse>(`/api/shipment/status?${q.toString()}`);
  return data;
}

export async function cancelShipmentApi(shipmentId: string): Promise<CancelShipmentResponse> {
  const data = await api<CancelShipmentResponse>(`/api/shipment/${encodeURIComponent(shipmentId)}/cancel`, {
    method: 'PUT',
  });
  return data;
}
