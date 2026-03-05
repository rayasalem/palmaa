/**
 * Cart API: per-user cart on the backend.
 * All requests send credentials (cookies) so the server uses req.auth.sub as user_id.
 * Used for multi-user: each user's cart is stored and persisted in the DB.
 */

import { api } from '../api/client';

/** Single item in cart as returned by GET /api/cart */
export interface CartItemResponse {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at?: string;
  product?: {
    id: string;
    name?: string;
    image_url?: string;
    price_ils?: number;
    condition?: string;
  };
}

/** Full cart response from API */
export interface CartResponse {
  id: string;
  user_id: string;
  items: CartItemResponse[];
  updated_at?: string;
}

/** API response envelope for cart endpoints */
export interface CartApiResponse {
  success: boolean;
  cart?: CartResponse;
  error?: string;
}

/**
 * Fetch current user's cart (requires auth). Returns cart with items.
 */
export async function getCart(): Promise<CartApiResponse> {
  try {
    const data = await api<{ success?: boolean; cart?: CartResponse }>('/api/cart');
    const cart = (data as { cart?: CartResponse })?.cart;
    const safeCart: CartResponse = cart
      ? { ...cart, items: Array.isArray(cart.items) ? cart.items : [] }
      : { id: '', user_id: '', items: [] };
    return { success: true, cart: safeCart };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load cart';
    return { success: false, error: message };
  }
}

/**
 * Add item to cart. Merges quantity if product already in cart. Price is set by server from products table.
 */
export async function addCartItem(product_id: string, quantity: number): Promise<CartApiResponse> {
  try {
    const data = await api<{ success: true; cart: CartResponse }>('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity: Math.max(1, quantity) }),
    });
    const cart = (data as { cart?: CartResponse })?.cart;
    return { success: true, cart: cart ?? { id: '', user_id: '', items: [] } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to add to cart';
    return { success: false, error: message };
  }
}

/**
 * Update item quantity. Server removes item if quantity <= 0.
 */
export async function updateCartItem(productId: string, quantity: number): Promise<CartApiResponse> {
  try {
    const data = await api<{ success: true; cart: CartResponse }>(`/api/cart/items/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    const cart = (data as { cart?: CartResponse })?.cart;
    return { success: true, cart: cart ?? { id: '', user_id: '', items: [] } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update cart';
    return { success: false, error: message };
  }
}

/**
 * Remove one product from cart.
 */
export async function removeCartItem(productId: string): Promise<CartApiResponse> {
  try {
    const data = await api<{ success: true; cart: CartResponse }>(`/api/cart/items/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    });
    const cart = (data as { cart?: CartResponse })?.cart;
    return { success: true, cart: cart ?? { id: '', user_id: '', items: [] } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to remove from cart';
    return { success: false, error: message };
  }
}

/**
 * Clear all items in current user's cart.
 */
export async function clearCartApi(): Promise<CartApiResponse> {
  try {
    const data = await api<{ success: true; cart: CartResponse }>('/api/cart', {
      method: 'DELETE',
    });
    const cart = (data as { cart?: CartResponse })?.cart;
    return { success: true, cart: cart ?? { id: '', user_id: '', items: [] } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to clear cart';
    return { success: false, error: message };
  }
}
