/**
 * Context for admin tabs. Avoids prop drilling when using lazy-loaded tab components.
 */

import React, { createContext, useContext } from 'react';
import type { Language } from '../../translations';
import { translations } from '../../translations';

export interface AdminUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  status: string;
  isMock?: boolean;
  source?: 'API' | 'SEED' | 'CLOUD';
  [key: string]: unknown;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: string;
  date: string;
}

export type AdminTab = 'users' | 'products' | 'orders' | 'treasury' | 'platform' | 'offers';

export interface AdminViewContextValue {
  activeTab: AdminTab;
  lang: Language;
  t: (typeof translations)[keyof typeof translations];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (id: string) => void;
  // Users
  allUsers: AdminUser[];
  setAllUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  withdrawals: WithdrawalRequest[];
  loading: boolean;
  refreshData: () => Promise<void>;
  actionLoading: string | null;
  setActionLoading: React.Dispatch<React.SetStateAction<string | null>>;
  filterStatus: 'ALL' | 'APPROVED' | 'PENDING';
  setFilterStatus: React.Dispatch<React.SetStateAction<'ALL' | 'APPROVED' | 'PENDING'>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  deleteModal: { userToDelete: AdminUser | null; deleteReason: string; deleteLoading: boolean };
  dispatchDeleteModal: React.Dispatch<{ type: string; user?: AdminUser; value?: string }>;
  filteredUsers: AdminUser[];
  pendingCount: number;
  pendingWithdrawals: WithdrawalRequest[];
  handleStatusChange: (userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING') => Promise<void>;
  openDeleteUserModal: (user: AdminUser) => void;
  closeDeleteUserModal: () => void;
  confirmDeleteUser: () => Promise<void>;
  handleRestoreUser: (user: AdminUser) => Promise<void>;
  // Products
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  productsLoading: boolean;
  productSearch: string;
  setProductSearch: React.Dispatch<React.SetStateAction<string>>;
  filteredProducts: any[];
  loadProducts: () => Promise<void>;
  handleProductToggleActive: (id: string, isActive: boolean) => Promise<void>;
  productToDelete: { id: string; name: string } | null;
  setProductToDelete: React.Dispatch<React.SetStateAction<{ id: string; name: string } | null>>;
  productDeleteLoading: boolean;
  handleProductDelete: (id: string, name: string) => Promise<void>;
  requestProductDelete: (id: string, name: string) => void;
  // Orders
  orders: any[];
  ordersLoading: boolean;
  loadOrders: () => Promise<void>;
  // Platform
  platformSettings: { commission_rate: number; tax_penalty_rate: number } | null;
  platformEarnings: {
    total_commission: number;
    total_tax_penalty: number;
    platform_earnings: number;
    transactions_count: number;
  } | null;
  platformLoading: boolean;
  settingsForm: { commission_rate: number; tax_penalty_rate: number };
  setSettingsForm: React.Dispatch<React.SetStateAction<{ commission_rate: number; tax_penalty_rate: number }>>;
  settingsSaving: boolean;
  loadPlatform: () => Promise<void>;
  handleSaveSettings: () => Promise<void>;
  // Treasury
  handleWithdrawal: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  // Offers (العروض)
  offers: any[];
  offersLoading: boolean;
  loadOffers: () => Promise<void>;
  createOffer: (payload: any) => Promise<boolean>;
  updateOffer: (id: string, payload: any) => Promise<boolean>;
  deleteOffer: (id: string) => Promise<boolean>;
}

const AdminViewContext = createContext<AdminViewContextValue | null>(null);

export function AdminViewProvider({ value, children }: { value: AdminViewContextValue; children: React.ReactNode }) {
  return <AdminViewContext.Provider value={value}>{children}</AdminViewContext.Provider>;
}

export function useAdminView() {
  const ctx = useContext(AdminViewContext);
  if (!ctx) throw new Error('useAdminView must be used within AdminViewProvider');
  return ctx;
}
