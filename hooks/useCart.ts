/**
 * useCart: syncs cart with backend for the current user (multi-user persistence).
 * When userId is set, fetches cart from API and exposes add/update/remove/clear that call API and update state.
 * Returns cart items in CartItem shape for compatibility with existing UI (Layout, CustomerView, Checkout).
 */

import { useState, useCallback, useEffect } from 'react';
import type { CartItem } from '../types';
import * as cartApi from '../services/cartApi';
import type { CartItemResponse } from '../services/cartApi';

/** Map API cart item to frontend CartItem (Product + quantity, price) */
function toCartItem(item: CartItemResponse): CartItem {
  const p = item.product;
  return {
    id: item.product_id,
    product_id: item.product_id,
    name: p?.name ?? '',
    description: '',
    category: '',
    stock: 0,
    quantity: item.quantity,
    price: item.price,
    price_ils: item.price,
    image_url: p?.image_url,
    imageUrl: p?.image_url,
    condition: p?.condition,
  } as CartItem;
}

export interface UseCartReturn {
  /** Cart items (from API when user is set, else empty) */
  cart: CartItem[];
  /** Loading cart from API */
  loading: boolean;
  /** Last error from API */
  error: string | null;
  /** Add product to cart (calls API when user is set) */
  addItem: (productId: string, quantity?: number) => Promise<boolean>;
  /** Update quantity (calls API when user is set); remove if quantity <= 0 */
  updateQuantity: (productId: string, deltaOrQuantity: number) => Promise<boolean>;
  /** Remove one product from cart */
  removeItem: (productId: string) => Promise<boolean>;
  /** Clear all items */
  clearCart: () => Promise<boolean>;
  /** Refetch cart from API */
  refetch: () => Promise<void>;
}

/**
 * When userId is provided, cart is loaded from and persisted to the backend.
 * When userId is null, cart stays empty (guest cart can be handled by parent state/localStorage).
 */
export function useCart(userId: string | null): UseCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setCart([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await cartApi.getCart();
      if (res.success && res.cart?.items) {
        setCart(res.cart.items.map(toCartItem));
      } else {
        setCart([]);
        if (res.error) setError(res.error);
      }
    } catch (_e) {
      setCart([]);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addItem = useCallback(
    async (productId: string, quantity = 1): Promise<boolean> => {
      if (!userId) return false;
      const res = await cartApi.addCartItem(productId, quantity);
      if (res.success && res.cart?.items) {
        setCart(res.cart.items.map(toCartItem));
        return true;
      }
      if (res.error) setError(res.error);
      return false;
    },
    [userId]
  );

  const updateQuantity = useCallback(
    async (productId: string, deltaOrQuantity: number): Promise<boolean> => {
      if (!userId) return false;
      const current = cart.find((i) => i.id === productId || i.product_id === productId);
      const newQty = current ? Math.max(0, current.quantity + deltaOrQuantity) : deltaOrQuantity;
      const res = await cartApi.updateCartItem(productId, newQty);
      if (res.success && res.cart?.items) {
        setCart(res.cart.items.map(toCartItem));
        return true;
      }
      if (res.error) setError(res.error);
      return false;
    },
    [userId, cart]
  );

  const removeItem = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!userId) return false;
      const res = await cartApi.removeCartItem(productId);
      if (res.success && res.cart?.items) {
        setCart(res.cart.items.map(toCartItem));
        return true;
      }
      if (res.error) setError(res.error);
      return false;
    },
    [userId]
  );

  const clearCart = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const res = await cartApi.clearCartApi();
    if (res.success && res.cart?.items) {
      setCart(res.cart.items.map(toCartItem));
      return true;
    }
    if (res.error) setError(res.error);
    return false;
  }, [userId]);

  return {
    cart,
    loading,
    error,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refetch,
  };
}
