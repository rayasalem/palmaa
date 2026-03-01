/**
 * Prefetch layer: preloads lazy chunks and API data on hover/focus or after login.
 * Does NOT change any route, hash, currentView, or props. Prefetch-only for better TTI/First Paint.
 *
 * Mapping (for documentation):
 * | Trigger              | Lazy component         | API prefetch (optional)     |
 * |----------------------|------------------------|-----------------------------|
 * | Guest: "Explore"     | PublicCatalog          | —                           |
 * | Guest: product card  | PublicProductDetails   | productService.fetchById(id)|
 * | Tab: profile        | ProfileView            | —                           |
 * | Tab: home/shop/cart/orders (CUSTOMER) | CustomerView | fetchMyOrders (after login) |
 * | Tab: dashboard/... (MERCHANT)        | MerchantView | getByMerchantId (after login) |
 * | Tab: users/... (ADMIN)                | AdminView    | getAll, getAdmin* (after login) |
 * | Product link hover   | PublicProductDetails   | productService.fetchById(id)|
 */

import type { User } from './types';
import { productService } from './services/productService';
import { userService } from './services/userService';
import { fetchMyOrders } from './services/checkoutApi';
import {
  getAdminProducts,
  getAdminOrders,
  getAdminSettings,
  getAdminPlatformEarnings,
} from './services/adminApi';

/** Chunk names used by App.tsx lazy() — same import paths so browser caches the chunk */
const CHUNKS: Record<string, () => Promise<unknown>> = {
  PublicWebsite: () => import('./components/PublicWebsite'),
  PublicCatalog: () => import('./components/PublicCatalog'),
  CustomerView: () => import('./views/CustomerView'),
  MerchantView: () => import('./views/MerchantView'),
  AdminView: () => import('./views/AdminView'),
  ProfileView: () => import('./views/ProfileView'),
  PublicProductDetails: () => import('./views/PublicProductDetails'),
};

const prefetched = new Set<string>();

/**
 * Prefetch a lazy-loaded component chunk (same as React.lazy import).
 * On hover/focus we run the import so the chunk is loaded; no state/route change.
 */
export function prefetchComponent(name: keyof typeof CHUNKS): void {
  if (prefetched.has(name)) return;
  prefetched.add(name);
  const fn = CHUNKS[name];
  if (fn) fn().catch(() => prefetched.delete(name));
}

/**
 * Prefetch product by ID so PublicProductDetails can benefit from cache/warm request.
 * Fire-and-forget; does not update any React state.
 */
export function prefetchProductData(productId: string): void {
  if (!productId) return;
  productService.fetchById(productId).catch(() => {});
}

/**
 * Map Layout tab id + role to the lazy chunk to prefetch on tab hover.
 * Used by Layout sidebar so hovering a tab preloads the corresponding view chunk.
 */
export function prefetchForTab(tabId: string, role: string): void {
  const r = (role || '').toUpperCase();
  if (r === 'CUSTOMER') {
    if (tabId === 'profile') prefetchComponent('ProfileView');
    else if (['home', 'shop', 'cart', 'orders_customer'].includes(tabId)) prefetchComponent('CustomerView');
    return;
  }
  if (r === 'MERCHANT') {
    if (tabId === 'profile') prefetchComponent('ProfileView');
    else if (['shop', 'cart'].includes(tabId)) prefetchComponent('CustomerView');
    else if (['dashboard', 'products', 'orders', 'earnings'].includes(tabId)) prefetchComponent('MerchantView');
    return;
  }
  if (r === 'ADMIN') {
    if (tabId === 'profile') prefetchComponent('ProfileView');
    else if (['shop', 'cart'].includes(tabId)) prefetchComponent('CustomerView');
    else if (['users', 'products', 'orders', 'treasury', 'platform'].includes(tabId)) prefetchComponent('AdminView');
    return;
  }
  if (r === 'BROKER') {
    if (tabId === 'profile') prefetchComponent('ProfileView');
    else if (['shop', 'cart'].includes(tabId)) prefetchComponent('CustomerView');
    // BrokerView is not lazy; no chunk to prefetch for other tabs
  }
}

/**
 * After login: prefetch API data by role in background so first open of Orders/Merchant/Admin is faster.
 * Does not set any state; only triggers requests (browser/network may cache).
 */
export function prefetchAfterLogin(user: User | null): void {
  if (!user?.id) return;
  const role = (user.role || '').toUpperCase();

  if (role === 'CUSTOMER') {
    fetchMyOrders().catch(() => {});
    return;
  }

  if (role === 'MERCHANT') {
    productService.getByMerchantId(user.id).catch(() => {});
    return;
  }

  if (role === 'ADMIN') {
    userService.getAll().catch(() => {});
    getAdminProducts().catch(() => {});
    getAdminOrders().catch(() => {});
    getAdminSettings().catch(() => {});
    getAdminPlatformEarnings().catch(() => {});
    return;
  }

  if (role === 'BROKER') {
    productService.getByMerchantId(user.id).catch(() => {});
  }
}
