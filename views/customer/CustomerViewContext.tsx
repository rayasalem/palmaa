/**
 * Context for CustomerView tab components to avoid prop drilling.
 * State and handlers are provided by CustomerView and consumed by CustomerShopTab, CustomerCartTab, CustomerOrdersTab.
 */

import React from 'react';
import type { Product, Order, OrderItem, CartItem } from '../../types';
import type { Language } from '../../translations';

export type CustomerViewContextValue = {
  lang: Language;
  t: Record<string, any>;
  // Shop
  filteredShopProducts: Product[];
  shopSearch: string;
  setShopSearch: (v: string) => void;
  shopCategoryId: string;
  shopConditionFilter: string;
  setShopConditionFilter: (v: string) => void;
  categorySearch: string;
  setCategorySearch: (v: string) => void;
  expandedGroupId: string | null;
  setExpandedGroupId: (v: string | null) => void;
  showAllGroups: boolean;
  setShowAllGroups: (v: boolean) => void;
  handleCategorySelect: (category: string) => void;
  handleAddToCart: (product: Product) => void;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (profileId: string) => void;
  // Cart
  cart: CartItem[];
  selectedCartIds: Set<string>;
  selectedCartItems: CartItem[];
  totalAmount: number;
  selectAllCart: () => void;
  toggleCartSelection: (id: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  handleRemoveFromCart: (productId: string, productName?: string) => void;
  onProceedToApiCheckout?: (items: CartItem[]) => void;
  // Orders
  displayOrders: Order[];
  apiOrders: any[];
  loadApiOrders: () => Promise<void>;
  handleCheckOrderStatus: (order: Order) => void;
  setCancelConfirmOrderId: (id: string | null) => void;
  setOrderToCancel: (order: Order | null) => void;
  processingCancelId: string | null;
  checkingStatusId: string | null;
  mapFlashlineStatus: (status: string) => string;
};

const CustomerViewContext = React.createContext<CustomerViewContextValue | null>(null);

export function useCustomerView(): CustomerViewContextValue {
  const ctx = React.useContext(CustomerViewContext);
  if (!ctx) throw new Error('useCustomerView must be used within CustomerViewProvider');
  return ctx;
}

export const CustomerViewProvider = CustomerViewContext.Provider;
