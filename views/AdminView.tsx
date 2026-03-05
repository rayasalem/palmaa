
import React, { useState, useEffect, useMemo, useCallback, useReducer } from 'react';
import { User, WithdrawalRequest } from '../types';
import { marketStore } from '../store';
import { userService } from '../services/userService';
import { getAdminProducts, updateAdminProduct, deleteAdminProduct, getAdminOrders, getAdminSettings, updateAdminSettings, getAdminPlatformEarnings } from '../services/adminApi';
import { translations, getAuthErrorMessage, type Language } from '../translations';
import { logEmail } from '../services/emailService';
import { resolveLocationName } from '../services/flashlineService';
import { Check, X, Shield, Users, Banknote, Package, Search, Database, Globe, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { ProductConditionBadge } from '../components/ProductConditionBadge';

interface AdminUser extends User {
  isMock?: boolean;
  source?: 'API' | 'SEED' | 'CLOUD';
}

type AdminTab = 'users' | 'products' | 'orders' | 'treasury' | 'platform';

interface AdminViewProps {
  view?: string;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

// --- Performance: reducer for delete-user modal state (logically grouped; avoids multiple useState updates) ---
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
    case 'OPEN': return { userToDelete: action.user, deleteReason: '', deleteLoading: false };
    case 'CLOSE': return deleteModalInitial;
    case 'SET_REASON': return { ...state, deleteReason: action.value };
    case 'CONFIRM_START': return { ...state, deleteLoading: true };
    case 'CONFIRM_SUCCESS': return deleteModalInitial;
    case 'CONFIRM_END': return { ...state, deleteLoading: false };
    default: return state;
  }
}

// --- Performance: memoized table row components to avoid re-rendering all rows when one updates ---
interface UserRowProps {
  user: AdminUser;
  isProcessing: boolean;
  lang: Language;
  t: ReturnType<typeof translations[keyof typeof translations]>;
  onStatusChange: (userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING') => void;
  onViewProfile: ((id: string) => void) | undefined;
  onRestore: (user: AdminUser) => void;
  onOpenDelete: (user: AdminUser) => void;
}
const UserRow = React.memo(function UserRow({ user, isProcessing, lang, t, onStatusChange, onViewProfile, onRestore, onOpenDelete }: UserRowProps) {
  const isSuspended = user.status === 'SUSPENDED';
  const isDeleted = user.status === 'DELETED';
  const isApproved = (user.status === 'APPROVED' || user.status === 'ACTIVE' || (user as any).isApproved) && !isSuspended && !isDeleted;
  const statusLabel = isDeleted
    ? (lang === 'ar' ? 'محذوف (مسودة 30 يوم)' : 'Deleted (30-day draft)')
    : isSuspended
    ? (lang === 'ar' ? 'موقوف' : 'Suspended')
    : isApproved
    ? t.common.approved
    : t.common.pending;
  const statusColor = isDeleted
    ? 'bg-slate-100 text-slate-500 border-slate-200'
    : isSuspended
    ? 'bg-red-50 text-red-600 border-red-100'
    : isApproved
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : 'bg-amber-50 text-amber-600 border-amber-100';
  const getSourceLabel = (u: AdminUser) => {
    if (u.source === 'API') return { label: t.common.realData, icon: <Database className="w-3 h-3" />, color: 'bg-slate-100 text-slate-500' };
    if (u.source && u.source === 'CLOUD') return { label: 'Database', icon: <Globe className="w-3 h-3" />, color: 'bg-indigo-50 text-indigo-600' };
    return { label: 'Registered', icon: <Check className="w-3 h-3" />, color: 'bg-palma-primary/10 text-palma-primary' };
  };
  const sourceMeta = getSourceLabel(user);
  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      <td className="px-8 py-5">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md ${user.source === 'SEED' ? 'bg-slate-400' : 'bg-palma-navy'}`}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 leading-tight">{user.name}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-8 py-5">
        <span className="bg-white border border-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-wide shadow-sm">
          {t.roles[user.role as keyof typeof t.roles] || user.role}
        </span>
      </td>
      <td className="px-8 py-5">
        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>
          {statusLabel}
        </span>
      </td>
      <td className="px-8 py-5">
        <span className={`flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${sourceMeta.color}`}>
          {sourceMeta.icon}
          {sourceMeta.label}
        </span>
      </td>
      <td className="px-8 py-5">
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            {(user.role === 'MERCHANT' || user.role === 'BROKER') && onViewProfile && (
              <button onClick={() => onViewProfile(user.id)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition" title={lang === 'ar' ? 'عرض الملف' : 'View profile'}>
                <Eye className="w-4 h-4" />
              </button>
            )}
            {!isDeleted && !isApproved && !isSuspended && (
              <button onClick={() => onStatusChange(user.id, 'APPROVED')} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition" title={t.common.approve}>
                <Check className="w-4 h-4" />
              </button>
            )}
            {isSuspended && (user.role === 'MERCHANT' || user.role === 'BROKER') && !isDeleted && (
              <button onClick={() => onStatusChange(user.id, 'APPROVED')} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition" title={lang === 'ar' ? 'إعادة التفعيل' : 'Reactivate'}>
                <Check className="w-4 h-4" />
              </button>
            )}
            {!isDeleted && !isSuspended && user.status !== 'REJECTED' && (
              <button onClick={() => onStatusChange(user.id, 'REJECTED')} className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition" title={t.common.reject}>
                <X className="w-4 h-4" />
              </button>
            )}
            {(user.role === 'MERCHANT' || user.role === 'BROKER') && isApproved && !isDeleted && (
              <button onClick={() => onStatusChange(user.id, 'SUSPENDED')} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition" title={lang === 'ar' ? 'تعليق المتجر' : 'Suspend store'}>
                <Shield className="w-4 h-4" />
              </button>
            )}
            {isDeleted ? (
              <button onClick={() => onRestore(user)} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition" title={lang === 'ar' ? 'استرجاع المستخدم' : 'Restore user'}>
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => onOpenDelete(user)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition" title={lang === 'ar' ? 'حذف المستخدم (مسودة 30 يوم)' : 'Delete user (30-day draft)'}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
});

interface ProductRowProps {
  product: any;
  isProcessing: boolean;
  t: ReturnType<typeof translations[keyof typeof translations]>;
  lang: Language;
  onViewProduct: ((id: string) => void) | undefined;
  onViewProfile: ((id: string) => void) | undefined;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string, name: string) => void;
}
const ProductRow = React.memo(function ProductRow({ product: p, isProcessing, t, lang, onViewProduct, onViewProfile, onToggleActive, onDelete }: ProductRowProps) {
  const isActive = p.is_active !== false && p.status !== 'inactive';
  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      <td className="px-6 py-4">
        <div
          className="flex items-center gap-4 cursor-pointer hover:opacity-80"
          onClick={() => onViewProduct && onViewProduct(p.id)}
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            <img src={p.image_url || p.images?.[0] || 'https://placehold.co/100'} loading="lazy" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black text-slate-900 line-clamp-1 block">
              {p.title || p.name}
            </span>
            <div className="mt-1">
              <ProductConditionBadge condition={p.condition || 'new'} lang={lang} />
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={() => { const mid = p.merchant_id; if (mid && onViewProfile) onViewProfile(mid); }}
          className="text-xs font-bold text-slate-700 hover:text-palma-primary hover:underline text-left"
        >{p.merchant_name ?? '-'}</button>
      </td>
      <td className="px-6 py-4 text-xs text-slate-600">{p.category || '-'}</td>
      <td className="px-6 py-4 text-sm font-black text-palma-primary">₪{p.price ?? p.price_ils ?? 0}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          {isActive ? t.common.active : t.common.inactive}
        </span>
      </td>
      <td className="px-6 py-4">
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-palma-primary border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onToggleActive(p.id, isActive)} className="p-2 rounded-lg hover:bg-slate-100 transition" title={isActive ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')}>
              {isActive ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-emerald-600" />}
            </button>
            <button onClick={() => onDelete(p.id, p.title || p.name)} className="p-2 rounded-lg hover:bg-red-50 transition" title={t.common.delete}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});

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
  const [platformSettings, setPlatformSettings] = useState<{ commission_rate: number; tax_penalty_rate: number } | null>(null);
  const [platformEarnings, setPlatformEarnings] = useState<{ total_commission: number; total_tax_penalty: number; platform_earnings: number; transactions_count: number } | null>(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ commission_rate: 15, tax_penalty_rate: 16 });
  const [deleteModal, dispatchDeleteModal] = useReducer(deleteModalReducer, deleteModalInitial);
  const { userToDelete, deleteReason, deleteLoading } = deleteModal;

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
      showToast(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved', 'success');
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'products') loadProducts();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'platform') loadPlatform();
  }, [activeTab]);

  // --- Performance: stable callback for table row actions (avoids inline arrows in .map) ---
  const handleStatusChange = useCallback(async (userId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING') => {
    setActionLoading(userId);
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    try {
      const response = await userService.updateUserStatus(userId, status);
      
      if (response.success) {
        const updatedUsers = allUsers.map(u => {
          if (u.id === userId) {
            return { 
              ...u, 
              status, 
              isApproved: status === 'APPROVED',
              approved_at: status === 'APPROVED' ? new Date().toISOString() : undefined 
            };
          }
          return u;
        });
        setAllUsers(updatedUsers);

        const subject = status === 'APPROVED' ? 'Account Approved' : status === 'SUSPENDED' ? 'Account Suspended' : 'Account Update';
        const message = status === 'APPROVED' 
          ? `Congratulations! Your merchant account for "${user.companyName || user.name}" has been approved. You can now log in and start selling.` 
          : status === 'SUSPENDED'
          ? `Your store account has been suspended. Contact support for more information.`
          : `We regret to inform you that your account application has been rejected.`;
        
        logEmail(user.email ?? '', subject, message);
        
        showToast(`${user.name} has been ${status.toLowerCase()}`, status === 'APPROVED' ? 'success' : 'info');
      } else {
        showToast(getAuthErrorMessage(response.error || '', lang) || response.error || (lang === 'ar' ? 'فشل التحديث' : 'Update failed'), 'error');
      }
    } catch (e: any) {
      showToast(getAuthErrorMessage(e?.message || '', lang) || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'), 'error');
    } finally {
      setActionLoading(null);
    }
  }, [allUsers, lang, showToast]);

  const handleWithdrawal = useCallback((id: string, status: 'APPROVED' | 'REJECTED') => {
    marketStore.updateWithdrawalStatus(id, status);
    const w = withdrawals.find(x => x.id === id);
    if (w) {
      const u = allUsers.find(user => user.id === w.userId);
      if (u) logEmail(u.email ?? '', `Withdrawal Update: ${status}`, `Your withdrawal request for ${w.amount} ILS has been ${status}.`);
      showToast(`Withdrawal request ${status.toLowerCase()}`, status === 'APPROVED' ? 'success' : 'info');
    }
    setWithdrawals(prev => prev.map(wd => wd.id === id ? { ...wd, status } : wd));
  }, [withdrawals, allUsers, showToast]);

  const getUserLocation = (user: User) => {
    if (user.cityId) {
      return resolveLocationName(user.cityId, 'city', lang);
    }
    return user.city || '-';
  };

  // --- Performance: memoize expensive filter/counts so they don't run every render ---
  const filteredUsers = useMemo(() => {
    let result = allUsers.filter(u => u.role !== 'ADMIN');
    if (filterStatus === 'APPROVED') {
      result = result.filter(u => (u.status === 'APPROVED' || u.status === 'ACTIVE' || u.isApproved) && u.status !== 'SUSPENDED');
    } else if (filterStatus === 'PENDING') {
      result = result.filter(u => u.status === 'PENDING' && !u.isApproved);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(lower) || 
        (u.email ?? '').toLowerCase().includes(lower) ||
        (u.phone ?? '').includes(lower)
      );
    }
    return result;
  }, [allUsers, filterStatus, searchTerm]);

  const pendingCount = useMemo(
    () => allUsers.filter(u => u.status === 'PENDING' && u.role !== 'ADMIN').length,
    [allUsers]
  );

  const pendingWithdrawals = useMemo(
    () => withdrawals.filter(w => w.status === 'PENDING'),
    [withdrawals]
  );

  const handleProductToggleActive = useCallback(async (id: string, isActive: boolean) => {
    setActionLoading(id);
    try {
      const res = await updateAdminProduct(id, { isActive: !isActive });
      if (res.success) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !isActive, status: !isActive ? 'active' : 'inactive' } : p)));
        showToast(t.common.success, 'success');
      } else {
        showToast(t.common.error, 'error');
      }
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [t.common.success, t.common.error, showToast]);

  const openDeleteUserModal = useCallback((user: AdminUser) => {
    dispatchDeleteModal({ type: 'OPEN', user });
  }, []);

  const closeDeleteUserModal = useCallback(() => {
    if (!deleteLoading) dispatchDeleteModal({ type: 'CLOSE' });
  }, [deleteLoading]);

  const confirmDeleteUser = useCallback(async () => {
    if (!userToDelete) return;
    if (!deleteReason.trim()) {
      showToast(lang === 'ar' ? 'يرجى إدخال سبب الحذف' : 'Please enter a deletion reason', 'error');
      return;
    }
    dispatchDeleteModal({ type: 'CONFIRM_START' });
    try {
      const res = await userService.softDeleteUser(userToDelete.id, deleteReason.trim());
      if (!res.success) {
        showToast(getAuthErrorMessage(res.error || '', lang) || res.error || (lang === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user'), 'error');
      } else {
        setAllUsers(prev =>
          prev.map(u =>
            u.id === userToDelete.id
              ? { ...u, status: 'DELETED' as any }
              : u
          )
        );
        showToast(
          lang === 'ar' ? 'تم إرسال المستخدم إلى المسودة وسيتم حذفه نهائياً بعد 30 يوماً' : 'User moved to draft and will be permanently removed after 30 days',
          'success'
        );
        dispatchDeleteModal({ type: 'CONFIRM_SUCCESS' });
      }
    } finally {
      dispatchDeleteModal({ type: 'CONFIRM_END' }); // keep loading until we have a way to set false; actually we need to set deleteLoading false in finally. So we need an action CONFIRM_END that sets deleteLoading: false, or in finally we dispatch CLOSE. Actually on success we already dispatch CONFIRM_SUCCESS which resets. On failure we don't dispatch anything so deleteLoading stays true. So we need either a CONFIRM_FAIL action or in the catch/finally we set loading false. Let me add action CONFIRM_END to set deleteLoading: false.
    }
  }, [userToDelete, deleteReason, lang, showToast]);

  const handleRestoreUser = useCallback(async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const res = await userService.restoreUser(user.id);
      if (!res.success) {
        showToast(
          res.error || (lang === 'ar' ? 'تعذر استرجاع المستخدم (قد تكون مدة 30 يوماً انتهت)' : 'Failed to restore user (restore window may have expired)'),
          'error'
        );
      } else {
        setAllUsers(prev =>
          prev.map(u =>
            u.id === user.id
              ? { ...u, status: 'PENDING' as any }
              : u
          )
        );
        showToast(lang === 'ar' ? 'تم استرجاع المستخدم للحالة قيد المراجعة' : 'User restored to pending status', 'success');
      }
    } finally {
      setActionLoading(null);
    }
  }, [lang, showToast]);

  const handleProductDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(lang === 'ar' ? `حذف "${name}"؟` : `Delete "${name}"?`)) return;
    setActionLoading(id);
    try {
      await deleteAdminProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast(t.common.success, 'success');
    } catch (e) {
      showToast(t.common.error, 'error');
    } finally {
      setActionLoading(null);
    }
  }, [lang, t.common.success, t.common.error, showToast]);

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

  return (
    <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 animate-in fade-in duration-500 pb-20 font-heading dashboard-page px-4 sm:px-6 pt-6">
      
      {/* Header — تصميم حديث */}
      <div className="dashboard-header">
         <div className="dashboard-title-wrap">
            <div className="dashboard-title-icon"><Shield className="w-6 h-6" /></div>
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy tracking-tight">{t.common.adminConsole}</h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{t.common.platformOversight}</p>
            </div>
         </div>
         <div className="dashboard-tabs">
            <button onClick={() => setActiveTab('users')} className={`dashboard-tab ${activeTab === 'users' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}>
               <Users className="w-3.5 h-3.5" /> {t.common.users}
               {pendingCount > 0 && <span className="bg-red-500 text-white min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1">{pendingCount}</span>}
            </button>
            <button onClick={() => setActiveTab('products')} className={`dashboard-tab ${activeTab === 'products' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}>
               <Package className="w-3.5 h-3.5" /> {t.common.products}
            </button>
            <button onClick={() => setActiveTab('orders')} className={`dashboard-tab ${activeTab === 'orders' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}>
               <Database className="w-3.5 h-3.5" /> {t.common.orders}
            </button>
            <button onClick={() => setActiveTab('treasury')} className={`dashboard-tab ${activeTab === 'treasury' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}>
               <Banknote className="w-3.5 h-3.5" /> {t.common.withdrawals}
               {pendingWithdrawals.length > 0 && <span className="bg-red-500 text-white min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1">{pendingWithdrawals.length}</span>}
            </button>
            <button onClick={() => setActiveTab('platform')} className={`dashboard-tab ${activeTab === 'platform' ? 'dashboard-tab-active' : 'dashboard-tab-inactive'}`}>
               <Shield className="w-3.5 h-3.5" /> {lang === 'ar' ? 'إعدادات المنصة' : 'Platform'}
            </button>
         </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Delete User Confirmation Modal — backdrop/cancel use closeDeleteUserModal (stable callback, no inline arrows) */}
          {userToDelete && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={closeDeleteUserModal}>
              <div
                className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 space-y-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-black text-palma-navy mb-2">
                  {lang === 'ar' ? 'تأكيد حذف المستخدم' : 'Confirm user deletion'}
                </h3>
                <p className="text-sm text-slate-600">
                  {lang === 'ar'
                    ? 'سيتم نقل الحساب إلى وضع المسودة ولن يتمكن صاحبه من تسجيل الدخول، وسيُحذف نهائياً بعد 30 يوماً ما لم يتم استرجاعه.'
                    : 'The account will be moved to draft, the user will not be able to log in, and it will be permanently removed after 30 days unless restored.'}
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-700">
                  <div>{userToDelete.name}</div>
                  <div className="text-slate-500 font-mono mt-1">{userToDelete.email}</div>
                </div>
                <div>
                  <label htmlFor="admin-delete-reason" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    {lang === 'ar' ? 'سبب الحذف (يظهر في السجل الداخلي)' : 'Deletion reason (internal log)'}
                  </label>
                  <textarea
                    id="admin-delete-reason"
                    name="deleteReason"
                    aria-label={lang === 'ar' ? 'سبب الحذف' : 'Deletion reason'}
                    className="w-full border border-slate-200 rounded-2xl p-3 text-sm font-medium bg-slate-50 focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 outline-none resize-none"
                    rows={3}
                    value={deleteReason}
                    onChange={(e) => dispatchDeleteModal({ type: 'SET_REASON', value: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: طلب المستخدم إغلاق الحساب / نشاط مخالف / حساب مكرر...' : 'e.g. User requested closure / policy violation / duplicate account...'}
                    disabled={deleteLoading}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={confirmDeleteUser}
                    disabled={deleteLoading}
                    className="flex-1 py-3.5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {deleteLoading
                      ? (lang === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                      : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm delete')}
                  </button>
                  <button
                    onClick={closeDeleteUserModal}
                    disabled={deleteLoading}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Filters Bar */}
          <div className="dashboard-card dashboard-card-body flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6">
             <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-palma-primary"></span> 
               {t.common.activeUsersDB} ({filteredUsers.length})
             </h3>

             <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-56">
                   <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3 pointer-events-none" />
                   <input 
                     type="text" 
                     placeholder={t.common.searchUsers} 
                     className="dashboard-input-search rtl:pl-4 rtl:pr-10"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                
                <div className="dashboard-filter-pills">
                   <button onClick={() => setFilterStatus('ALL')} className={`dashboard-filter-pill ${filterStatus === 'ALL' ? 'bg-white text-palma-navy shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>{t.common.showAll}</button>
                   <button onClick={() => setFilterStatus('APPROVED')} className={`dashboard-filter-pill ${filterStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>{t.common.approvedOnly}</button>
                   <button onClick={() => setFilterStatus('PENDING')} className={`dashboard-filter-pill ${filterStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>{t.common.pendingOnly}</button>
                </div>
             </div>
          </div>

          {/* User List */}
          {loading ? (
             <div className="dashboard-empty py-20">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-palma-primary rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-semibold text-slate-500">{t.common.loading}</p>
             </div>
          ) : filteredUsers.length === 0 ? (
             <div className="dashboard-empty">
                <span className="text-4xl block mb-4 grayscale opacity-60">👥</span>
                <p className="text-slate-500 font-semibold text-sm">{t.common.noData}</p>
             </div>
          ) : (
             <div className="dashboard-card">
               <div className="dashboard-table-wrap">
                 <table className="dashboard-table min-w-full text-left rtl:text-right">
                   <thead>
                     <tr>
                       <th className="w-64">{t.auth.name} / {t.auth.email}</th>
                       <th>{t.auth.role}</th>
                       <th>{t.common.status}</th>
                       <th>Source</th>
                       <th>{t.common.actions}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 font-bold">
                    {filteredUsers.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        isProcessing={actionLoading === user.id}
                        lang={lang}
                        t={t}
                        onStatusChange={handleStatusChange}
                        onViewProfile={onViewProfile}
                        onRestore={handleRestoreUser}
                        onOpenDelete={openDeleteUserModal}
                      />
                    ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col lg:flex-row justify-between items-center gap-6">
            <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-palma-primary animate-pulse"></span>
              {lang === 'ar' ? 'كل المنتجات' : 'All Products'} ({filteredProducts.length})
            </h3>
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-palma-muted absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث عن منتج...' : 'Search products...'}
                className="w-full pl-9 rtl:pr-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-palma-primary"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            <button onClick={loadProducts} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase transition-all">
              {lang === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
          {productsLoading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common.loading}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{t.common.noData}</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left rtl:text-right">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.productName}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{lang === 'ar' ? 'التاجر' : 'Merchant'}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.category}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.price}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.status}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {filteredProducts.map((p) => (
                      <ProductRow
                        key={p.id}
                        product={p}
                        isProcessing={actionLoading === p.id}
                        t={t}
                        lang={lang}
                        onViewProduct={onViewProduct}
                        onViewProfile={onViewProfile}
                        onToggleActive={handleProductToggleActive}
                        onDelete={handleProductDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex justify-between items-center">
            <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-palma-primary animate-pulse"></span>
              {lang === 'ar' ? 'كل الطلبات' : 'All Orders'} ({orders.length})
            </h3>
            <button onClick={loadOrders} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase transition-all">
              {lang === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
          {ordersLoading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common.loading}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
              <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{t.common.noData}</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left rtl:text-right">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.orderRef}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.customer}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.amount}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.status}</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.date}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {orders.map((o) => {
                      const status = (o.status || o.payment_status || 'PENDING').toUpperCase();
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-slate-600">{o.id}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-900">{o.shipping_name || o.recipient_name || '-'}</span>
                            <span className="block text-[10px] text-slate-500">{o.shipping_phone || o.phone || ''}</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-palma-primary">₪{o.total_amount ?? o.amount ?? 0}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                              status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' :
                              status === 'PAID' || status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'treasury' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3 mb-8">
               <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span> {t.common.pendingWithdrawals} ({pendingWithdrawals.length})
            </h3>

            {pendingWithdrawals.length === 0 ? (
               <div className="p-20 bg-white rounded-[3rem] border border-slate-100 text-center shadow-soft">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                    <Banknote className="w-8 h-8" />
                  </div>
                  <p className="text-palma-navy font-bold text-lg">{t.common.treasuryClear}</p>
                  <p className="text-palma-muted text-sm uppercase tracking-wide mt-1">{t.common.noPendingWithdrawals}</p>
               </div>
            ) : (
               <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-100 overflow-hidden">
                  <table className="min-w-full">
                     <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                           <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.requestID}</th>
                           <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.users}</th>
                           <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.amount}</th>
                           <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.date}</th>
                           <th className="px-8 py-5 text-left rtl:text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.common.actions}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {pendingWithdrawals.map(w => {
                           const reqUser = allUsers.find(u => u.id === w.userId);
                           return (
                              <tr key={w.id} className="hover:bg-slate-50 transition group">
                                 <td className="px-8 py-5 text-xs font-mono text-slate-500 font-bold">{w.id.split('-')[0]}...</td>
                                 <td className="px-8 py-5">
                                    <div className="text-sm font-black text-slate-900">{reqUser?.name || w.userId}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{reqUser ? t.roles[reqUser.role as keyof typeof t.roles] : 'Unknown'}</div>
                                 </td>
                                 <td className="px-8 py-5 text-lg font-black text-palma-primary">{w.amount} ₪</td>
                                 <td className="px-8 py-5 text-xs text-slate-500 font-bold">{new Date(w.date).toLocaleDateString()}</td>
                                 <td className="px-8 py-5 flex gap-3">
                                    <button onClick={() => handleWithdrawal(w.id, 'APPROVED')} className="bg-palma-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition shadow-lg shadow-soft">{t.common.approve}</button>
                                    <button onClick={() => handleWithdrawal(w.id, 'REJECTED')} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition">{t.common.reject}</button>
                                 </td>
                              </tr>
                           )
                        })}
                     </tbody>
                  </table>
               </div>
            )}
        </div>
      )}

      {activeTab === 'platform' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-palma-primary animate-pulse"></span>
            {lang === 'ar' ? 'إعدادات المنصة وأرباح العمولة' : 'Platform settings & commission earnings'}
          </h3>

          {platformLoading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common.loading}</p>
            </div>
          ) : (
            <>
              {/* أرباح المنصة: عمولة 15% + غرامة ضريبية */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
                  <div className="flex items-center gap-3 text-slate-500 mb-2">
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">{lang === 'ar' ? 'إجمالي العمولة (15%)' : 'Total commission (15%)'}</span>
                  </div>
                  <p className="text-2xl font-black text-palma-navy">₪{platformEarnings?.total_commission?.toFixed(2) ?? '0.00'}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
                  <div className="flex items-center gap-3 text-slate-500 mb-2">
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">{lang === 'ar' ? 'غرامة عدم الفاتورة (16%)' : 'Tax penalty (16%)'}</span>
                  </div>
                  <p className="text-2xl font-black text-palma-navy">₪{platformEarnings?.total_tax_penalty?.toFixed(2) ?? '0.00'}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-palma-primary/20 shadow-soft bg-palma-primary/5">
                  <div className="flex items-center gap-3 text-palma-primary mb-2">
                    <Shield className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">{lang === 'ar' ? 'أرباح المنصة' : 'Platform earnings'}</span>
                  </div>
                  <p className="text-2xl font-black text-palma-primary">₪{platformEarnings?.platform_earnings?.toFixed(2) ?? '0.00'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{platformEarnings?.transactions_count ?? 0} {lang === 'ar' ? 'عملية تسوية' : 'settlements'}</p>
                </div>
              </div>

              {/* خانة دفع: نسبة العمولة ونسبة الغرامة الضريبية (قابلة للتعديل من الأدمن) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
                <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {lang === 'ar' ? 'نسب الخصم (قابلة للتعديل)' : 'Commission & tax penalty rates'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{lang === 'ar' ? 'نسبة العمولة %' : 'Commission %'}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={settingsForm.commission_rate}
                      onChange={(e) => setSettingsForm((s) => ({ ...s, commission_rate: Number(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-palma-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{lang === 'ar' ? 'نسبة غرامة عدم الفاتورة %' : 'Tax penalty %'}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={settingsForm.tax_penalty_rate}
                      onChange={(e) => setSettingsForm((s) => ({ ...s, tax_penalty_rate: Number(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-palma-primary"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="mt-6 px-8 py-3 bg-palma-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-palma-navy/90 transition disabled:opacity-50"
                >
                  {settingsSaving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الإعدادات' : 'Save settings')}
                </button>
              </div>
            </>
            )}
        </div>
      )}
    </div>
  );
};
