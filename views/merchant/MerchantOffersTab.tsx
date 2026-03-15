/**
 * Merchant Offers tab — التاجر يضيف خصومات على منتج أو تصنيف كامل أو كل منتجاته، مع مدة اختيارية.
 */

import React, { useState, useEffect } from 'react';
import { Tag, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';
import { PRODUCT_CATEGORIES } from '../../types';
import type { Product } from '../../types';
import {
  getMerchantOffers,
  createMerchantOffer,
  updateMerchantOffer,
  deleteMerchantOffer,
  type MerchantOffer,
} from '../../services/merchantOffersApi';

interface MerchantOffersTabProps {
  lang: 'ar' | 'en' | 'he';
  t: Record<string, any>;
  products: Product[];
  onRefresh?: () => void;
}

export default function MerchantOffersTab({ lang, t, products, onRefresh }: MerchantOffersTabProps) {
  const { showToast } = useToast();
  const [offers, setOffers] = useState<MerchantOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MerchantOffer | null>(null);
  const [form, setForm] = useState({
    scope: 'all' as 'product' | 'category' | 'all',
    title: '',
    discount_label: 0,
    product_id: '',
    category: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await getMerchantOffers();
      if (res.success && res.offers) setOffers(res.offers);
      else setOffers([]);
    } catch (_err) {
      setOffers([]);
      showToast(lang === 'ar' ? 'تعذّر تحميل العروض' : 'Could not load offers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const resetForm = () => {
    setForm({
      scope: 'all',
      title: '',
      discount_label: 0,
      product_id: '',
      category: '',
      starts_at: '',
      ends_at: '',
      is_active: true,
    });
    setEditing(null);
    setShowForm(false);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (o: MerchantOffer) => {
    setEditing(o);
    setForm({
      scope: (o.scope as 'product' | 'category' | 'all') || 'all',
      title: o.title || '',
      discount_label: o.discount_label || 0,
      product_id: o.product_id || '',
      category: o.category || '',
      starts_at: o.starts_at ? o.starts_at.slice(0, 16) : '',
      ends_at: o.ends_at ? o.ends_at.slice(0, 16) : '',
      is_active: o.is_active !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        scope: form.scope,
        title: form.title.trim() || (lang === 'ar' ? 'عرض تخفيض' : 'Discount offer'),
        discount_label: Math.min(100, Math.max(0, form.discount_label)),
        product_id: form.scope === 'product' && form.product_id ? form.product_id : null,
        category: form.scope === 'category' && form.category ? form.category : null,
        starts_at: form.starts_at.trim() || null,
        ends_at: form.ends_at.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        const res = await updateMerchantOffer(editing.id, payload);
        if (res.success) {
          resetForm();
          loadOffers();
          onRefresh?.();
          showToast(lang === 'ar' ? 'تم حفظ العرض' : 'Offer saved', 'success');
        }
      } else {
        const res = await createMerchantOffer(payload);
        if (res.success) {
          resetForm();
          loadOffers();
          onRefresh?.();
          showToast(lang === 'ar' ? 'تم إضافة العرض' : 'Offer added', 'success');
        }
      }
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'حدث خطأ' : 'Error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await deleteMerchantOffer(id);
      if (res.success) {
        setOffers((prev) => prev.filter((o) => o.id !== id));
        onRefresh?.();
        showToast(lang === 'ar' ? 'تم حذف العرض' : 'Offer deleted', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'حدث خطأ' : 'Error'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const productName = (id: string) => products.find((p) => p.id === id)?.name || products.find((p) => p.id === id)?.title || id;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
          <Tag className="w-5 h-5 text-palma-primary" />
          {lang === 'ar' ? 'عروض التخفيض' : 'Discount offers'} ({offers.length})
        </h3>
        <div className="flex gap-3">
          <button type="button" onClick={loadOffers} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase">
            {lang === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
          <button type="button" onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-palma-primary text-white rounded-xl text-xs font-black uppercase hover:bg-palma-navy transition-colors">
            <Plus className="w-4 h-4" />
            {lang === 'ar' ? 'إضافة عرض' : 'Add offer'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-3xl border-2 border-palma-primary/20 shadow-soft">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-palma-navy">
              {editing ? (lang === 'ar' ? 'تعديل العرض' : 'Edit offer') : lang === 'ar' ? 'عرض تخفيض جديد' : 'New discount offer'}
            </h4>
            <button type="button" onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'نطاق الخصم' : 'Discount scope'}
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as 'product' | 'category' | 'all' })}
              >
                <option value="all">{lang === 'ar' ? 'كل منتجاتي' : 'All my products'}</option>
                <option value="category">{lang === 'ar' ? 'تصنيف معيّن' : 'Specific category'}</option>
                <option value="product">{lang === 'ar' ? 'منتج معيّن' : 'Specific product'}</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                {form.scope === 'all' && (lang === 'ar' ? 'الخصم يُطبّق على أي منتج من منتجاتك في السلة.' : 'Discount applies to any of your products in the cart.')}
                {form.scope === 'category' && (lang === 'ar' ? 'الخصم يُطبّق على منتجات التصنيف المحدد فقط.' : 'Discount applies only to products in the selected category.')}
                {form.scope === 'product' && (lang === 'ar' ? 'الخصم يُطبّق على المنتج المحدد فقط.' : 'Discount applies only to the selected product.')}
              </p>
            </div>
            {form.scope === 'category' && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'ar' ? 'التصنيف' : 'Category'} *
                </label>
                <select
                  required={form.scope === 'category'}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">{lang === 'ar' ? '— اختر تصنيفًا —' : '— Select category —'}</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
            {form.scope === 'product' && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'ar' ? 'المنتج' : 'Product'} *
                </label>
                <select
                  required={form.scope === 'product'}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                >
                  <option value="">{lang === 'ar' ? '— اختر منتجًا —' : '— Select product —'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{(p.name || p.title || p.id).slice(0, 60)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'العنوان (اختياري)' : 'Title (optional)'}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={lang === 'ar' ? 'مثال: خصم 20%' : 'e.g. 20% off'}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'نسبة الخصم (%)' : 'Discount (%)'} *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.discount_label || ''}
                onChange={(e) => setForm({ ...form, discount_label: parseInt(e.target.value, 10) || 0 })}
                placeholder="20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'ar' ? 'بداية العرض (اختياري)' : 'Start (optional)'}
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'ar' ? 'نهاية العرض (اختياري)' : 'End (optional)'}
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'اترك التاريخين فارغين ليكون العرض دائماً فعّالاً.' : 'Leave dates empty for the offer to be always active.'}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="mo-active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-palma-primary"
              />
              <label htmlFor="mo-active" className="text-sm font-bold text-slate-700">
                {lang === 'ar' ? 'فعّال' : 'Active'}
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-palma-primary text-white font-black text-sm uppercase disabled:opacity-60">
                {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : editing ? (lang === 'ar' ? 'حفظ' : 'Save') : lang === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common?.loading ?? 'Loading'}</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100">
          <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            {lang === 'ar' ? 'لا توجد عروض. اضغط «إضافة عرض».' : 'No offers. Click «Add offer».'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4 flex flex-col">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {o.scope === 'all' ? (lang === 'ar' ? 'كل المنتجات' : 'All') : o.scope === 'category' ? (lang === 'ar' ? 'تصنيف' : 'Category') : lang === 'ar' ? 'منتج' : 'Product'}
                </span>
                {!o.is_active && (
                  <span className="text-[10px] font-bold text-amber-600 uppercase">{lang === 'ar' ? 'غير فعّال' : 'Inactive'}</span>
                )}
              </div>
              <h5 className="font-black text-palma-navy mb-1 line-clamp-2">{o.title || `%${o.discount_label}`}</h5>
              <p className="text-sm font-black text-emerald-600 mb-2">%{o.discount_label}</p>
              {o.scope === 'category' && o.category && <p className="text-xs text-slate-400 truncate">{o.category}</p>}
              {o.scope === 'product' && o.product_id && <p className="text-xs text-slate-400 truncate">{productName(o.product_id)}</p>}
              {(o.starts_at || o.ends_at) && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {o.starts_at && new Date(o.starts_at).toLocaleDateString()}
                  {o.starts_at && o.ends_at ? ' – ' : ''}
                  {o.ends_at && new Date(o.ends_at).toLocaleDateString()}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-3">
                <button type="button" onClick={() => openEdit(o)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold">
                  <Pencil className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button type="button" onClick={() => handleDelete(o.id)} disabled={deletingId === o.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  {deletingId === o.id ? (lang === 'ar' ? 'جاري...' : '...') : lang === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
