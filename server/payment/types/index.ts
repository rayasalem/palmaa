/**
 * Order and API types for Arabic Bank payment module.
 */

export interface Order {
  id: string;
  amount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionBody {
  orderId: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
}

export interface CreateSessionResponse {
  success: boolean;
  redirectUrl?: string;
  paymentToken?: string;
  orderId: string;
  error?: string;
}

export interface WebhookPayload {
  orderId: string;
  transactionId: string;
  status: 'success' | 'failed';
  amount: number;
  currency: string;
  timestamp: string;
  signature?: string;
}
