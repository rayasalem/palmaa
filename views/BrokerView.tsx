import React, { useState, useEffect } from 'react';
import { User, CommissionStatus, Product, SharedProduct } from '../types';
import { marketStore } from '../store';
import { Language, translations, getAuthErrorMessage } from '../translations';
import { useToast } from '../components/ToastProvider';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  upsertSharedProduct,
  listSharedProducts,
  removeSharedProduct,
  toggleSharedFeatured,
} from '../services/brokerApi';

interface Props {
  lang: Language;
  user: User;
  onRefresh: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

export const BrokerView: React.FC<Props> = ({
  lang,
  user,
  onRefresh,
  activeTab,
  onTabChange,
  onViewProduct,
  onViewProfile,
}) => {
  const t = translations[lang];
  const { showToast } = useToast();

  // Modal State
  const [marketingModal, setMarketingModal] = useState<{ productId: string; shareId?: string } | null>(null);
  const [marketingForm, setMarketingForm] = useState({ title: '', description: '', discountText: '' });
  const [sharedMeta, setSharedMeta] = useState<SharedProduct[]>([]);
  const [savingShare, setSavingShare] = useState(false);
  const [removeConfirmPid, setRemoveConfirmPid] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const products = marketStore.getProducts();

  useEffect(() => {
    (async () => {
      try {
        const res = await listSharedProducts();
        if (res.success && res.shared) {
          const mapped: SharedProduct[] = res.shared.map((s: any) => ({
            id: s.id,
            broker_id: s.broker_id,
            product_id: s.product_id,
            shared_at: s.shared_at,
            clicks: s.clicks ?? 0,
            sales: s.sales ?? 0,
            marketing_title: s.marketing_title,
            marketing_description: s.marketing_description,
            custom_discount_text: s.custom_discount_text,
            is_featured: s.is_featured ?? false,
          }));
          setSharedMeta(mapped);
          return;
        }
      } catch {
        /* fallback to local */
      }
      setSharedMeta(marketStore.getSharedProducts(user.id));
    })();
  }, [user.id]);
  const myCommissions = marketStore.getCommissions().filter((c) => c.broker_id === user.id || c.broker_id === user.id);

  const handleGenLink = (pid: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const trackingLink = `${baseUrl}?ref=${user.id}&prod=${pid}&broker=${user.id}#/product/${pid}`;
    navigator.clipboard.writeText(trackingLink);
    marketStore.incrementClicks(user.id); // Track click
    onRefresh();
    showToast(lang === 'en' ? 'Link copied! Share to earn.' : 'تم نسخ الرابط! شاركه للبدء بالربح.', 'success');
  };

  const openShareModal = (pid: string, existingShare?: SharedProduct) => {
    setMarketingModal({ productId: pid, shareId: existingShare?.id });
    if (existingShare) {
      setMarketingForm({
        title: existingShare.marketing_title || '',
        description: existingShare.marketing_description || '',
        discountText: existingShare.custom_discount_text || '',
      });
    } else {
      setMarketingForm({ title: '', description: '', discountText: '' });
    }
  };

  const saveMarketingShare = async () => {
    if (!marketingModal) return;
    setSavingShare(true);
    try {
      const res = await upsertSharedProduct(marketingModal.productId, {
        marketing_title: marketingForm.title,
        marketing_description: marketingForm.description,
        custom_discount_text: marketingForm.discountText,
      });
      if (res.success && res.shared) {
        const s = res.shared;
        const newShare: SharedProduct = {
          id: s.id,
          broker_id: s.broker_id,
          product_id: s.product_id,
          shared_at: s.shared_at,
          clicks: s.clicks ?? 0,
          sales: s.sales ?? 0,
          marketing_title: s.marketing_title,
          marketing_description: s.marketing_description,
          custom_discount_text: s.custom_discount_text,
          is_featured: s.is_featured ?? false,
        };
        setSharedMeta((prev) => {
          const idx = prev.findIndex((sp) => sp.broker_id === user.id && sp.product_id === marketingModal.productId);
          if (idx >= 0) return prev.map((sp, i) => (i === idx ? newShare : sp));
          return [newShare, ...prev];
        });
        marketStore.upsertSharedProduct(user.id, marketingModal.productId, {
          marketing_title: marketingForm.title,
          marketing_description: marketingForm.description,
          custom_discount_text: marketingForm.discountText,
        });
      }
      showToast(t.common.success, 'success');
      setMarketingModal(null);
      onRefresh();
    } catch (e: any) {
      showToast(
        getAuthErrorMessage(e?.message || '', lang) || (lang === 'en' ? 'Failed to save' : 'فشل الحفظ'),
        'error'
      );
    } finally {
      setSavingShare(false);
    }
  };

  const handleToggleFeatured = async (shareId: string) => {
    try {
      const res = await toggleSharedFeatured(shareId);
      if (res.success && res.shared) {
        setSharedMeta((prev) =>
          prev.map((sp) => (sp.id === shareId ? { ...sp, is_featured: res.shared!.is_featured } : sp))
        );
        marketStore.toggleSharedProductFeatured(shareId);
      }
      showToast(t.common.success, 'success');
      onRefresh();
    } catch {
      showToast(t.common.error, 'error');
    }
  };

  const handleRemoveShare = async (pid: string) => {
    setRemoveLoading(true);
    try {
      await removeSharedProduct(pid);
      setSharedMeta((prev) => prev.filter((sp) => sp.product_id !== pid));
      marketStore.removeSharedProduct(user.id, pid);
      setRemoveConfirmPid(null);
      showToast(t.common.success, 'success');
      onRefresh();
    } catch {
      showToast(t.common.error, 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  const totalEarned = myCommissions.reduce((s, c) => s + c.amount, 0);
  const pendingCommission = myCommissions.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto font-heading">
      <ConfirmModal
        isOpen={!!removeConfirmPid}
        title={lang === 'ar' ? 'إزالة من القائمة' : 'Remove from list'}
        message={
          lang === 'ar'
            ? 'هل تريد إزالة هذا المنتج من قائمة المنتجات المشتركة؟'
            : 'Remove this product from your shared products list?'
        }
        confirmLabel={lang === 'ar' ? 'إزالة' : 'Remove'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        onConfirm={() => removeConfirmPid && handleRemoveShare(removeConfirmPid)}
        onCancel={() => setRemoveConfirmPid(null)}
        isLoading={removeLoading}
        variant="danger"
      />
      {/* Marketing Description Modal */}
      {marketingModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setMarketingModal(null)}
        >
          <div
            className="bg-white rounded-[3rem] p-10 max-w-lg w-full space-y-8 animate-in zoom-in-95 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="heading-block">
              <h3 className="heading-block-title font-heading">{lang === 'en' ? 'Promote Product' : 'ترويج المنتج'}</h3>
              <p className="heading-block-sub">
                {lang === 'en' ? 'Customize your marketing message' : 'خصص رسالتك التسويقية لجمهورك'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">
                  {lang === 'en' ? 'Catchy Headline' : 'عنوان جذاب'}
                </label>
                <input
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-palma-primary transition-all"
                  value={marketingForm.title}
                  onChange={(e) => setMarketingForm({ ...marketingForm, title: e.target.value })}
                  placeholder={lang === 'en' ? 'e.g. Best Winter Deal!' : 'مثال: أفضل عرض لهذا الشتاء!'}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">
                  {lang === 'en' ? 'Your Personal Recommendation' : 'توصيتك الشخصية'} *
                </label>
                <textarea
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-medium outline-none focus:ring-2 focus:ring-palma-primary focus:bg-white resize-none h-28 transition-all"
                  value={marketingForm.description}
                  onChange={(e) => setMarketingForm({ ...marketingForm, description: e.target.value })}
                  placeholder={
                    lang === 'en'
                      ? 'Tell your audience why they should buy this...'
                      : 'أخبر جمهورك لماذا يجب عليهم شراء هذا المنتج...'
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">
                  {lang === 'en' ? 'Special Note / Discount' : 'ملاحظة خاصة / خصم'}
                </label>
                <input
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-palma-primary transition-all"
                  value={marketingForm.discountText}
                  onChange={(e) => setMarketingForm({ ...marketingForm, discountText: e.target.value })}
                  placeholder={lang === 'en' ? 'e.g. Limited time offer' : 'مثال: عرض لفترة محدودة'}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={saveMarketingShare}
                disabled={savingShare}
                className="btn-primary w-full py-5 text-[11px] uppercase tracking-widest active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingShare
                  ? lang === 'en'
                    ? 'Saving...'
                    : 'جاري الحفظ...'
                  : `${t.common.save} & ${lang === 'en' ? 'Add to Portfolio' : 'إضافة للمحفظة'}`}
              </button>
              <button
                onClick={() => setMarketingModal(null)}
                disabled={savingShare}
                className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-palma-primary p-8 rounded-2xl text-white shadow-card-hover relative group overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">
              {lang === 'en' ? 'Total Balance' : 'الرصيد الكلي'}
            </p>
            <h3 className="text-3xl font-black">₪{user.balance?.toFixed(0) || 0}</h3>
            <p className="text-[10px] font-bold opacity-80 mt-2">
              {lang === 'en' ? 'Available for payout' : 'متاح للسحب'}
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 group-hover:scale-125 transition-transform duration-700">
            🌍
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-palma-border shadow-card group hover:shadow-card-hover transition-all">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
            {lang === 'en' ? 'Pending Commission' : 'عمولات معلقة'}
          </p>
          <h3 className="text-3xl font-black text-slate-900">₪{pendingCommission.toFixed(0)}</h3>
          <p className="text-[10px] font-bold text-amber-500 mt-2">
            {lang === 'en' ? 'Processing orders' : 'طلبات قيد التنفيذ'}
          </p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-palma-border shadow-card group hover:shadow-card-hover transition-all">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{t.common.clicks}</p>
          <h3 className="text-3xl font-black text-slate-900">{user.clicks || 0}</h3>
          <p className="text-[10px] font-bold text-palma-primary mt-2">
            {lang === 'en' ? 'Traffic generated' : 'زيارات تم جلبها'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-[2rem] border border-palma-border shadow-soft flex overflow-x-auto scrollbar-hide gap-2">
        {[
          { id: 'subscription', label: lang === 'en' ? 'Subscription' : 'باقة الاشتراك', icon: '📋' },
          { id: 'promote', label: lang === 'en' ? 'Market Promotion' : 'سوق الترويج', icon: '🏪' },
          { id: 'portfolio', label: lang === 'en' ? 'My Portfolio' : 'محفظتي', icon: '💼' },
          { id: 'earnings', label: t.common.earnings, icon: '💸' },
          { id: 'stats', label: t.common.stats, icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all whitespace-nowrap ${
              activeTab === tab.id || (activeTab === 'dashboard' && tab.id === 'subscription')
                ? 'bg-palma-primary text-white shadow-soft'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === 'subscription' || activeTab === 'dashboard') && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="heading-block heading-block-sm text-left">
            <h2 className="heading-block-title font-heading text-palma-navy">
              {lang === 'en' ? 'Subscription plan' : 'باقة الاشتراك'}
            </h2>
            <p className="heading-block-sub">
              {lang === 'en'
                ? 'Your plan and renewal options for the broker account.'
                : 'خطتك وخيارات التجديد لحساب الوسيط.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div className="bg-white rounded-2xl border-2 border-palma-primary/30 p-6 shadow-soft hover:shadow-md transition-shadow">
              <h4 className="font-heading text-lg font-black text-palma-navy mb-2">
                {lang === 'en' ? 'Free trial' : 'تجربة مجانية'}
              </h4>
              <p className="text-2xl font-black text-palma-primary mb-2">$0</p>
              <p className="text-sm text-slate-600 mb-4">
                {lang === 'en'
                  ? '6 months free to try the platform, then choose a plan to continue.'
                  : '٦ أشهر مجانية لتجربة المنصة، ثم اختر باقة للمتابعة.'}
              </p>
              <span className="inline-block text-[10px] font-black uppercase bg-palma-primaryLight text-palma-primary px-3 py-1.5 rounded-full">
                {lang === 'en' ? 'Current default' : 'الافتراضي الحالي'}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft opacity-90">
              <h4 className="font-heading text-lg font-black text-palma-navy mb-2">
                {lang === 'en' ? 'Paid plan' : 'باقة مدفوعة'}
              </h4>
              <p className="text-2xl font-black text-slate-400 mb-2">—</p>
              <p className="text-sm text-slate-600 mb-4">
                {lang === 'en'
                  ? 'Extra benefits and extended usage. Coming soon – contact support for early access.'
                  : 'مزايا إضافية واستخدام ممتد. قريباً – تواصل مع الدعم للوصول المبكر.'}
              </p>
              <button
                type="button"
                disabled
                className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black uppercase bg-slate-200 text-slate-500 cursor-not-allowed"
              >
                {lang === 'en' ? 'Coming soon' : 'قريباً'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'promote' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h2 className="font-heading text-xl font-black text-palma-navy">
              {lang === 'en' ? 'Find Products to Promote' : 'اكتشف منتجات للترويج'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p) => {
              const mName = marketStore.getMerchantNameByUserId(p.merchant_id || p.merchantId || '');
              const existingShare = sharedMeta.find((s) => s.product_id === p.id);
              const displayImage =
                p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-[2.5rem] p-4 border border-palma-border group shadow-card hover:shadow-card-hover transition-all duration-300 card-hover-lift"
                >
                  <div
                    className="aspect-square rounded-[2rem] overflow-hidden bg-slate-50 mb-4 relative cursor-pointer"
                    onClick={() => onViewProduct && onViewProduct(p.id)}
                  >
                    <img
                      src={displayImage}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={p.name}
                    />
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg text-palma-primary">
                      2% {lang === 'en' ? 'Commission' : 'عمولة'}
                    </div>
                  </div>
                  <div className="px-2 space-y-3 mb-6">
                    <div>
                      <h4
                        className="font-black text-slate-900 text-base truncate leading-tight group-hover:text-palma-primary transition-colors cursor-pointer"
                        onClick={() => onViewProduct && onViewProduct(p.id)}
                      >
                        {p.name}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const mid = p.merchant_id || p.merchantId;
                          if (mid && onViewProfile) onViewProfile(mid);
                        }}
                        className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-palma-primary hover:underline text-left"
                      >
                        {t.common.merchantName}: {mName}
                      </button>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl">
                      <span className="text-[9px] font-black uppercase text-slate-300">{t.common.yield}</span>
                      <span className="text-sm font-black text-palma-primary">
                        ₪{((p.price || p.price_ils || 0) * 0.02).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => openShareModal(p.id, existingShare)}
                      className="w-full py-3 bg-slate-900 text-white rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest hover:bg-palma-primary transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>🚀</span>{' '}
                      {existingShare
                        ? lang === 'en'
                          ? 'Edit Promo'
                          : 'تعديل الترويج'
                        : lang === 'en'
                          ? 'Promote'
                          : 'ترويج'}
                    </button>
                    {existingShare && (
                      <button
                        onClick={() => handleGenLink(p.id)}
                        className="w-full py-2.5 bg-slate-50 text-slate-400 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                      >
                        🔗 {lang === 'en' ? 'Copy Link' : 'نسخ الرابط'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center px-4">
            <div className="heading-block heading-block-sm text-left">
              <h2 className="heading-block-title font-heading text-palma-navy">
                {lang === 'en' ? 'My Promotional Page' : 'صفحتي الترويجية'}
              </h2>
              <p className="heading-block-sub">
                {lang === 'en' ? 'Managing your unique product endorsements' : 'إدارة توصياتك ومنتجاتك'}
              </p>
            </div>
          </div>

          {sharedMeta.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
              <span className="text-5xl block mb-6">🏜️</span>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                {lang === 'en'
                  ? 'Your portfolio is empty. Endorse products to start.'
                  : 'محفظتك فارغة. ابدأ بترويج المنتجات الآن.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {sharedMeta
                .slice()
                .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
                .map((s) => {
                  const p = products.find((prod) => prod.id === s.product_id);
                  if (!p) return null;
                  const mName = marketStore.getMerchantNameByUserId(p.merchant_id || p.merchantId || '');
                  const displayImage =
                    p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
                  return (
                    <div
                      key={s.id}
                      className={`bg-white rounded-[3.5rem] p-8 md:p-12 border-2 ${s.is_featured ? 'border-palma-primary shadow-2xl scale-[1.01]' : 'border-slate-50 shadow-sm'} flex flex-col md:flex-row gap-10 hover:shadow-xl transition-all group relative overflow-hidden`}
                    >
                      {/* Featured Ribbon */}
                      {s.is_featured && (
                        <div className="absolute top-0 right-12 bg-palma-primary text-white px-6 py-2 rounded-b-2xl text-[9px] font-black uppercase tracking-widest shadow-lg z-10">
                          ⭐ Pinned Promotion
                        </div>
                      )}

                      <div
                        className="w-full md:w-64 aspect-square rounded-[2.5rem] overflow-hidden bg-slate-50 relative shrink-0 cursor-pointer"
                        onClick={() => onViewProduct && onViewProduct(p.id)}
                      >
                        <img
                          src={displayImage}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                        />
                        {s.custom_discount_text && (
                          <div className="absolute bottom-6 left-6 right-6 bg-amber-400 text-amber-900 p-3 rounded-2xl text-[10px] font-black uppercase text-center shadow-xl">
                            {s.custom_discount_text}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <span className="bg-palma-primaryLight text-palma-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                {lang === 'en' ? 'Promoted by' : 'ترويج بواسطة'} {user.name}
                              </span>
                              <h4
                                className="font-black text-slate-900 text-2xl tracking-tight mt-3 cursor-pointer hover:text-palma-primary"
                                onClick={() => onViewProduct && onViewProduct(p.id)}
                              >
                                {p.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const mid = p.merchant_id || p.merchantId;
                                  if (mid && onViewProfile) onViewProfile(mid);
                                }}
                                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-palma-primary hover:underline text-left"
                              >
                                {t.common.merchantName}: {mName}
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleFeatured(s.id)}
                                className={`p-3 rounded-2xl transition-all ${s.is_featured ? 'bg-palma-primary text-white' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                                title="Pin"
                              >
                                📌
                              </button>
                              <button
                                onClick={() => openShareModal(p.id, s)}
                                className="p-3 bg-slate-50 text-slate-400 hover:bg-palma-primary/10 hover:text-palma-primary rounded-2xl transition-all"
                                title="Edit"
                              >
                                📝
                              </button>
                              <button
                                onClick={() => setRemoveConfirmPid(p.id)}
                                className="p-3 bg-rose-50 text-rose-300 hover:text-rose-600 rounded-2xl transition-all"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* Broker Marketing Text */}
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative group-hover:bg-white group-hover:border-palma-primary/20 transition-all">
                            {s.marketing_title && (
                              <h5 className="font-black text-slate-900 text-sm mb-2 uppercase tracking-wide">
                                “{s.marketing_title}”
                              </h5>
                            )}
                            <p className="text-slate-600 text-sm font-medium leading-relaxed italic line-clamp-3">
                              “{s.marketing_description || 'No description added.'}”
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6 pt-4 border-t border-slate-50">
                          <div className="flex gap-4">
                            <div className="text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{t.common.clicks}</p>
                              <p className="text-lg font-black text-slate-900">{s.clicks || 0}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-100"></div>
                            <div className="text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{t.common.sales}</p>
                              <p className="text-lg font-black text-slate-900">{s.sales || 0}</p>
                            </div>
                          </div>

                          <div className="flex-1 w-full flex gap-3">
                            <button
                              onClick={() => handleGenLink(p.id)}
                              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-palma-primary transition-all shadow-lg active:scale-95"
                            >
                              {lang === 'en' ? 'Copy Referral Link' : 'نسخ رابط الإحالة'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in duration-500">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-heading text-lg font-black text-palma-navy">{t.common.earnings} History</h3>
            <span className="text-[10px] font-black uppercase bg-palma-primaryLight text-palma-primary px-3 py-1 rounded-lg">
              Total: ₪{totalEarned.toFixed(2)}
            </span>
          </div>
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-black">
              <tr>
                <th className="px-8 py-5 text-left rtl:text-right">{lang === 'en' ? 'Order Ref' : 'مرجع الطلب'}</th>
                <th className="px-8 py-5 text-left rtl:text-right">{t.common.commission}</th>
                <th className="px-8 py-5 text-left rtl:text-right">{t.common.date}</th>
                <th className="px-8 py-5 text-left rtl:text-right">{t.common.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              {myCommissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-slate-400">
                    {lang === 'en' ? 'No earnings recorded yet' : 'لا توجد أرباح مسجلة بعد'}
                  </td>
                </tr>
              ) : (
                myCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-mono text-[10px] text-slate-400">{c.order_id}</td>
                    <td className="px-8 py-5 text-palma-primary">₪{c.amount.toFixed(2)}</td>
                    <td className="px-8 py-5 text-slate-400">{new Date(c.date).toLocaleDateString()}</td>
                    <td className="px-8 py-5">
                      <span
                        className={`uppercase text-[9px] font-black px-2 py-1 rounded-lg ${c.status === 'PAID' ? 'bg-palma-primaryLight text-palma-primary' : 'bg-amber-50 text-amber-600'}`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest">
                {lang === 'en' ? 'Performance Summary' : 'ملخص الأداء'}
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">
                    {lang === 'en' ? 'Total Clicks' : 'مجموع النقرات'}
                  </span>
                  <span className="text-sm font-black text-slate-900">{user.clicks || 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-bold text-slate-500">
                    {lang === 'en' ? 'Conversion Rate' : 'معدل التحويل'}
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {user.clicks ? ((myCommissions.length / user.clicks) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-palma-primary h-full rounded-full"
                    style={{ width: `${user.clicks ? Math.min(100, (myCommissions.length / user.clicks) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-sm font-black mb-2 uppercase tracking-widest text-slate-400">
                  {lang === 'en' ? 'Next Payout' : 'الدفعة القادمة'}
                </h4>
                <h3 className="text-4xl font-black mb-6">₪{user.balance?.toFixed(0) || 0}</h3>
                <button className="bg-palma-primary text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                  {lang === 'en' ? 'Request Withdrawal' : 'طلب سحب'}
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 text-9xl opacity-5">💰</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerView;
