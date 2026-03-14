import React, { useState, useEffect, useMemo, useCallback, useReducer, lazy, Suspense } from 'react';
import { User, WithdrawalRequest } from '../types';
import { marketStore } from '../store';
import { userService } from '../services/userService';
import {
  getAdminProducts,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  getAdminSettings,
  updateAdminSettings,
  getAdminPlatformEarnings,
} from '../services/adminApi';
import {
  getAdminOffers,
  createOffer as createOfferApi,
  updateOffer as updateOfferApi,
  deleteOffer as deleteOfferApi,
} from '../services/offersApi';
import { translations, getAuthErrorMessage, type Language } from '../translations';
import { logEmail } from '../services/emailService';
import { useToast } from '../components/ToastProvider';
import { Shield, Users, Banknote, Package, Database, Tag } from 'lucide-react';
import { AdminViewProvider, type AdminTab } from './admin/AdminViewContext';

interface AdminUser extends User {
  isMock?: boolean;
  source?: 'API' | 'SEED' | 'CLOUD';
}

interface AdminViewProps {
  view?: string;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

type DeleteModalState = { userToDelete: AdminUser | null; deleteReason: string; deleteLoading: boolean };
type DeleteModalAction =
  | { type: 'OPEN'; user: AdminUser }
  | { type: 'CLOSE' }
  | { type: 'SET_REASON'; value: string }
  | { type: 'CONFIRM_START' }
  | { type: 'CONFIRM_SUCCESS' }
  | { type: 'CONFIRM_END' };
const deleteModalInitial: DeleteModalState = { userToDelete: null, deleteReason: '', deleteLoading: false };
function deleteModalReducer(state: DeleteModalState, action: DeleteModalAction): DeleteModalState {
  switch (action.type) {
    case 'OPEN':
      return { userToDelete: action.user, deleteReason: '', deleteLoading: false };
    case 'CLOSE':
      return deleteModalInitial;
    case 'SET_REASON':
      return { ...state, deleteReason: action.value };
    case 'CONFIRM_START':
      return { ...state, deleteLoading: true };
    case 'CONFIRM_SUCCESS':
      return deleteModalInitial;
    case 'CONFIRM_END':
      return { ...state, deleteLoading: false };
    default:
      return state;
  }
}

const AdminUsersTab = lazy(() => import('./admin/AdminUsersTab'));
const AdminProductsTab = lazy(() => import('./admin/AdminProductsTab'));
const AdminOrdersTab = lazy(() => import('./admin/AdminOrdersTab'));
const AdminTreasuryTab = lazy(() => import('./admin/AdminTreasuryTab'));
const AdminPlatformTab = lazy(() => import('./admin/AdminPlatformTab'));
const AdminOffersTab = lazy(() => import('./admin/AdminOffersTab'));

function TabSkeleton() {
  return (
    <div className="animate-in fade-in duration-300 py-12 flex items-center justify-center min-h-[200px]">
      <div className="w-10 h-10 border-2 border-slate-200 border-t-palma-primary rounded-full animate-spin" />
    </div>
  );
}

export const AdminView: React.FC<AdminViewProps> = ({ view = 'users', onViewProduct, onViewProfile }) => {
  const lang: Language = document.documentElement.dir === 'ltr' ? 'en' : 'ar';
  const t = translations[lang];
  const { showToast } = useToast();

  const viewToTab: Record<string, AdminTab> = {
    users: 'users',
    products: 'products',
    orders: 'orders',
    withdrawals: 'treasury',
    treasury: 'treasury',
    platform: 'platform',
    settings: 'platform',
    offers: 'offers',
  };
  const [activeTab, setActiveTab] = useState<AdminTab>(viewToTab[view] || 'users');
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [platformSettings, setPlatformSettings] = useState<{
    commission_rate: number;
    tax_penalty_rate: number;
  } | null>(null);
  const [platformEarnings, setPlatformEarnings] = useState<{
    total_commission: number;
    total_tax_penalty: number;
    platform_earnings: number;
    transactions_count: number;
  } | null>(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ commission_rate: 15, tax_penalty_rate: 16 });
  const [deleteModal, dispatchDeleteModal] = useReducer(deleteModalReducer, deleteModalInitial);
  const { userToDelete, deleteReason, deleteLoading } = deleteModal;
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [productDeleteLoading, setProductDeleteLoading] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => {
    setActiveTab(viewToTab[view] || 'users');
  }, [view]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const fetched = await userService.getAll();
      setAllUsers(fetched.map((u) => ({ ...u, source: 'API' as const })));
      setWithdrawals([...marketStore.getWithdrawals()]);
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await getAdminProducts();
      if (res.success && res.products) setProducts(res.products);
      else setProducts([]);
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await getAdminOrders();
      if (res.success && res.orders) setOrders(res.orders);
      else setOrders([]);
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadPlatform = async () => {
    setPlatformLoading(true);
    try {
      const [settingsRes, earningsRes] = await Promise.all([getAdminSettings(), getAdminPlatformEarnings()]);
      if (settingsRes.success && settingsRes.settings) {
        setPlatformSettings(settingsRes.settings);
        setSettingsForm({
          commission_rate: Math.round((settingsRes.settings.commission_rate || 0.15) * 100),
          tax_penalty_rate: Math.round((settingsRes.settings.tax_penalty_rate || 0.16) * 100),
        });
      }
      if (earningsRes.success) {
        setPlatformEarnings({
          total_commission: earningsRes.total_commission ?? 0,
          total_tax_penalty: earningsRes.total_tax_penalty ?? 0,
          platform_earnings: earningsRes.platform_earnings ?? 0,
          transactions_count: earningsRes.transactions_count ?? 0,
        });
      }
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setPlatformLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await updateAdminSettings({
        commission_rate: settingsForm.commission_rate / 100,
        tax_penalty_rate: settingsForm.tax_penalty_rate / 100,
      });
      setPlatformSettings({
        commission_rate: settingsForm.commission_rate / 100,
        tax_penalty_rate: settingsForm.tax_penalty_rate / 100,
      });
      showToast(lang === 'ar' ? 'طھظ… ط­ظپط¸ ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ' : 'Settings saved', 'success');
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const res = await getAdminOffers();
      if (res.success && res.offers) setOffers(res.offers);
      else setOffers([]);
    } catch {
      showToast(t.common.error, 'error');
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [showToast, t.common.error]);

  const createOffer = useCallback(
    async (payload: any) => {
      try {
        const res = await createOfferApi(payload);
        if (res.success) {
          await loadOffers();
          showToast(lang === 'ar' ? 'تمت إضافة العرض' : 'Offer added', 'success');
          return true;
        }
        showToast(res.error || t.common.error, 'error');
        return false;
      } catch {
        showToast(t.common.error, 'error');
        return false;
      }
    },
    [lang, loadOffers, showToast, t.common.error]
  );

  const updateOffer = useCallback(
    async (id: string, payload: any) => {
      try {
        const res = await updateOfferApi(id, payload);
        if (res.success) {
          await loadOffers();
          showToast(lang === 'ar' ? 'تم تحديث العرض' : 'Offer updated', 'success');
          return true;
        }
        showToast(res.error || t.common.error, 'error');
        return false;
      } catch {
        showToast(t.common.error, 'error');
        return false;
      }
    },
    [lang, loadOffers, showToast, t.common.error]
  );

  const deleteOffer = useCallback(
    async (id: string) => {
      try {
        const res = await deleteOfferApi(id);
        if (res.success) {
          setOffers((prev) => prev.filter((o) => o.id !== id));
          showToast(lang === 'ar' ? 'تم حذف العرض' : 'Offer deleted', 'success');
          return true;
        }
        showToast(res.error || t.common.error, 'error');
        return false;
      } catch {
        showToast(t.common.error, 'error');
        return false;
      }
    },
    [lang, showToast, t.common.error]
  );

  useEffect(() => {
    if (activeTab === 'products') loadProducts();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'platform') loadPlatform();
    if (activeTab === 'offers') {
      loadOffers();
      loadProducts(); // لتحديد منتج عند إضافة عرض من نوع "منتج"
    }
  }, [activeTab, loadOffers]);

  // --- Performance: stable callback for table row actions (avoids inline arrows in .map) ---
  const handleStatusChange = useCallback(
    async (userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING') => {
      setActionLoading(userId);
      const user = allUsers.find((u) => u.id === userId);
      if (!user) return;

      try {
        const response = await userService.updateUserStatus(userId, status);

        if (response.success) {
          const updatedUsers = allUsers.map((u) => {
            if (u.id === userId) {
              return {
                ...u,
                status,
                isApproved: status === 'APPROVED',
                approved_at: status === 'APPROVED' ? new Date().toISOString() : undefined,
              };
            }
            return u;
          });
          setAllUsers(updatedUsers);

          const subject =
            status === 'APPROVED'
              ? 'Account Approved'
              : status === 'SUSPENDED'
                ? 'Account Suspended'
                : 'Account Update';
          const message =
            status === 'APPROVED'
              ? `Congratulations! Your merchant account for "${user.companyName || user.name}" has been approved. You can now log in and start selling.`
              : status === 'SUSPENDED'
                ? `Your store account has been suspended. Contact support for more information.`
                : `We regret to inform you that your account application has been rejected.`;

          logEmail(user.email ?? '', subject, message);

          showToast(`${user.name} has been ${status.toLowerCase()}`, status === 'APPROVED' ? 'success' : 'info');
        } else {
          showToast(
            getAuthErrorMessage(response.error || '', lang) ||
              response.error ||
              (lang === 'ar' ? 'ظپط´ظ„ ط§ظ„طھط­ط¯ظٹط«' : 'Update failed'),
            'error'
          );
        }
      } catch (e: any) {
        showToast(
          getAuthErrorMessage(e?.message || '', lang) || (lang === 'ar' ? 'ط­ط¯ط« ط®ط·ط£' : 'An error occurred'),
          'error'
        );
      } finally {
        setActionLoading(null);
      }
    },
    [allUsers, lang, showToast]
  );

  const handleWithdrawal = useCallback(
    (id: string, status: 'APPROVED' | 'REJECTED') => {
      marketStore.updateWithdrawalStatus(id, status);
      const w = withdrawals.find((x) => x.id === id);
      if (w) {
        const u = allUsers.find((user) => user.id === w.userId);
        if (u)
          logEmail(
            u.email ?? '',
            `Withdrawal Update: ${status}`,
            `Your withdrawal request for ${w.amount} ILS has been ${status}.`
          );
        showToast(`Withdrawal request ${status.toLowerCase()}`, status === 'APPROVED' ? 'success' : 'info');
      }
      setWithdrawals((prev) => prev.map((wd) => (wd.id === id ? { ...wd, status } : wd)));
    },
    [withdrawals, allUsers, showToast]
  );

  // --- Performance: memoize expensive filter/counts so they don't run every render ---
  const filteredUsers = useMemo(() => {
    let result = allUsers.filter((u) => u.role !== 'ADMIN');
    if (filterStatus === 'APPROVED') {
      result = result.filter(
        (u) => (u.status === 'APPROVED' || (u as any).status === 'ACTIVE' || u.isApproved) && u.status !== 'SUSPENDED'
      );
    } else if (filterStatus === 'PENDING') {
      result = result.filter((u) => u.status === 'PENDING' && !u.isApproved);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          (u.email ?? '').toLowerCase().includes(lower) ||
          (u.phone ?? '').includes(lower)
      );
    }
    return result;
  }, [allUsers, filterStatus, searchTerm]);

  const pendingCount = useMemo(
    () => allUsers.filter((u) => u.status === 'PENDING' && u.role !== 'ADMIN').length,
    [allUsers]
  );

  const pendingWithdrawals = useMemo(() => withdrawals.filter((w) => w.status === 'PENDING'), [withdrawals]);

  const handleProductToggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      setActionLoading(id);
      try {
        const res = await updateAdminProduct(id, { isActive: !isActive });
        if (res.success) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, is_active: !isActive, status: !isActive ? 'active' : 'inactive' } : p
            )
          );
          showToast(t.common.success, 'success');
        } else {
          showToast(t.common.error, 'error');
        }
      } catch (e) {
        showToast(t.common.error, 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [t.common.success, t.common.error, showToast]
  );

  const openDeleteUserModal = useCallback((user: AdminUser) => {
    dispatchDeleteModal({ type: 'OPEN', user });
  }, []);

  const closeDeleteUserModal = useCallback(() => {
    if (!deleteLoading) dispatchDeleteModal({ type: 'CLOSE' });
  }, [deleteLoading]);

  const confirmDeleteUser = useCallback(async () => {
    if (!userToDelete) return;
    if (!deleteReason.trim()) {
      showToast(lang === 'ar' ? 'ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط³ط¨ط¨ ط§ظ„ط­ط°ظپ' : 'Please enter a deletion reason', 'error');
      return;
    }
    dispatchDeleteModal({ type: 'CONFIRM_START' });
    try {
      const res = await userService.softDeleteUser(userToDelete.id, deleteReason.trim());
      if (!res.success) {
        showToast(
          getAuthErrorMessage(res.error || '', lang) ||
            res.error ||
            (lang === 'ar' ? 'ظپط´ظ„ ط­ط°ظپ ط§ظ„ظ…ط³طھط®ط¯ظ…' : 'Failed to delete user'),
          'error'
        );
      } else {
        setAllUsers((prev) => prev.map((u) => (u.id === userToDelete.id ? { ...u, status: 'DELETED' as any } : u)));
        showToast(
          lang === 'ar'
            ? 'طھظ… ط¥ط±ط³ط§ظ„ ط§ظ„ظ…ط³طھط®ط¯ظ… ط¥ظ„ظ‰ ط§ظ„ظ…ط³ظˆط¯ط© ظˆط³ظٹطھظ… ط­ط°ظپظ‡ ظ†ظ‡ط§ط¦ظٹط§ظ‹ ط¨ط¹ط¯ 30 ظٹظˆظ…ط§ظ‹'
            : 'User moved to draft and will be permanently removed after 30 days',
          'success'
        );
        dispatchDeleteModal({ type: 'CONFIRM_SUCCESS' });
      }
    } finally {
      dispatchDeleteModal({ type: 'CONFIRM_END' }); // keep loading until we have a way to set false; actually we need to set deleteLoading false in finally. So we need an action CONFIRM_END that sets deleteLoading: false, or in finally we dispatch CLOSE. Actually on success we already dispatch CONFIRM_SUCCESS which resets. On failure we don't dispatch anything so deleteLoading stays true. So we need either a CONFIRM_FAIL action or in the catch/finally we set loading false. Let me add action CONFIRM_END to set deleteLoading: false.
    }
  }, [userToDelete, deleteReason, lang, showToast]);

  const handleRestoreUser = useCallback(
    async (user: AdminUser) => {
      setActionLoading(user.id);
      try {
        const res = await userService.restoreUser(user.id);
        if (!res.success) {
          showToast(
            res.error ||
              (lang === 'ar'
                ? 'طھط¹ط°ط± ط§ط³طھط±ط¬ط§ط¹ ط§ظ„ظ…ط³طھط®ط¯ظ… (ظ‚ط¯ طھظƒظˆظ† ظ…ط¯ط© 30 ظٹظˆظ…ط§ظ‹ ط§ظ†طھظ‡طھ)'
                : 'Failed to restore user (restore window may have expired)'),
            'error'
          );
        } else {
          setAllUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: 'PENDING' as any } : u)));
          showToast(
            lang === 'ar'
              ? 'طھظ… ط§ط³طھط±ط¬ط§ط¹ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ„ظ„ط­ط§ظ„ط© ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©'
              : 'User restored to pending status',
            'success'
          );
        }
      } finally {
        setActionLoading(null);
      }
    },
    [lang, showToast]
  );

  const handleProductDelete = useCallback(
    async (id: string, name: string) => {
      setProductDeleteLoading(true);
      setActionLoading(id);
      try {
        await deleteAdminProduct(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setProductToDelete(null);
        showToast(t.common.success, 'success');
      } catch (e) {
        showToast(t.common.error, 'error');
      } finally {
        setProductDeleteLoading(false);
        setActionLoading(null);
      }
    },
    [t.common.success, t.common.error, showToast]
  );

  const requestProductDelete = useCallback((id: string, name: string) => {
    setProductToDelete({ id, name });
  }, []);

  const filteredProducts = useMemo(
    () =>
      productSearch
        ? products.filter(
            (p) =>
              (p.title || p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
              (p.category || '').toLowerCase().includes(productSearch.toLowerCase())
          )
        : products,
    [products, productSearch]
  );

  const contextValue = useMemo(
    () => ({
      activeTab,
      lang,
      t,
      showToast,
      onViewProduct,
      onViewProfile,
      allUsers: allUsers as any,
      setAllUsers,
      withdrawals,
      loading,
      refreshData,
      actionLoading,
      setActionLoading,
      filterStatus,
      setFilterStatus,
      searchTerm,
      setSearchTerm,
      deleteModal: {
        userToDelete: deleteModal.userToDelete,
        deleteReason: deleteModal.deleteReason,
        deleteLoading: deleteModal.deleteLoading,
      },
      dispatchDeleteModal,
      filteredUsers: filteredUsers as any,
      pendingCount,
      pendingWithdrawals,
      handleStatusChange,
      openDeleteUserModal,
      closeDeleteUserModal,
      confirmDeleteUser,
      handleRestoreUser,
      products,
      setProducts,
      productsLoading,
      productSearch,
      setProductSearch,
      filteredProducts,
      loadProducts,
      handleProductToggleActive,
      productToDelete,
      setProductToDelete,
      productDeleteLoading,
      handleProductDelete,
      requestProductDelete,
      orders,
      ordersLoading,
      loadOrders,
      platformSettings,
      platformEarnings,
      platformLoading,
      settingsForm,
      setSettingsForm,
      settingsSaving,
      loadPlatform,
      handleSaveSettings,
      handleWithdrawal,
      offers,
      offersLoading,
      loadOffers,
      createOffer,
      updateOffer,
      deleteOffer,
    }),
    [
      activeTab,
      lang,
      t,
      showToast,
      onViewProduct,
      onViewProfile,
      allUsers,
      withdrawals,
      loading,
      refreshData,
      actionLoading,
      filterStatus,
      searchTerm,
      deleteModal,
      filteredUsers,
      pendingCount,
      pendingWithdrawals,
      products,
      productsLoading,
      productSearch,
      filteredProducts,
      productToDelete,
      productDeleteLoading,
      orders,
      ordersLoading,
      platformSettings,
      platformEarnings,
      platformLoading,
      settingsForm,
      settingsSaving,
      offers,
      offersLoading,
      loadOffers,
      createOffer,
      updateOffer,
      deleteOffer,
    ]
  );

  return (
    <AdminViewProvider value={contextValue as any}>
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 animate-in fade-in duration-500 pb-20 font-heading dashboard-page px-4 sm:px-6 pt-6">
        <div className="dashboard-header">
          <div className="dashboard-title-wrap">
            <div className="dashboard-title-icon">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy tracking-tight">
                {t.common.adminConsole}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{t.common.platformOversight}</p>
            </div>
          </div>
          <div className="dashboard-tabs">
            <button
              onClick={() => setActiveTab('users')}
              className={`dashboard-tab ${activeTab === 'users' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
            >
              <Users className="w-3.5 h-3.5" /> {t.common.users}
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`dashboard-tab ${activeTab === 'products' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
            >
              <Package className="w-3.5 h-3.5" /> {t.common.products}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`dashboard-tab ${activeTab === 'orders' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
            >
              <Database className="w-3.5 h-3.5" /> {t.common.orders}
            </button>
            <button
              onClick={() => setActiveTab('treasury')}
              className={`dashboard-tab ${activeTab === 'treasury' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
            >
              <Banknote className="w-3.5 h-3.5" /> {t.common.withdrawals}
              {pendingWithdrawals.length > 0 && (
                <span className="bg-red-500 text-white min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1">
                  {pendingWithdrawals.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('platform')}
              className={`dashboard-tab ${activeTab === 'platform' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
            >
              <Shield className="w-3.5 h-3.5" /> {lang === 'ar' ? 'إعدادات المنصة' : 'Platform'}
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`dashboard-tab ${activeTab === 'offers' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}
            >
              <Tag className="w-3.5 h-3.5" /> {lang === 'ar' ? 'العروض' : 'Offers'}
            </button>
          </div>
        </div>

        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'users' && <AdminUsersTab />}
          {activeTab === 'products' && <AdminProductsTab />}
          {activeTab === 'orders' && <AdminOrdersTab />}
          {activeTab === 'treasury' && <AdminTreasuryTab />}
          {activeTab === 'platform' && <AdminPlatformTab />}
          {activeTab === 'offers' && <AdminOffersTab />}
        </Suspense>
      </div>
    </AdminViewProvider>
  );
};
