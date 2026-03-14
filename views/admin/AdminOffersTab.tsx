/**
 * Admin Offers tab — إدارة قسم العروض في المتجر.
 * الإدمن يضيف عروضاً (بطاقة مخصصة أو منتج).
 */

import React, { useState } from 'react';
import { Tag, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAdminView } from './AdminViewContext';
import type { ShopOffer } from '../../services/offersApi';

export default function AdminOffersTab() {
  const {
    lang,
    t,
    offers,
    offersLoading,
    loadOffers,
    createOffer,
    updateOffer,
    deleteOffer,
    products,
  } = useAdminView();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShopOffer | null>(null);
  const [form, setForm] = useState({
    type: 'custom' as 'custom' | 'product',
    title: '',
    subtitle: '',
    discount_label: 0,
    image_url: '',
    product_id: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      type: 'custom',
      title: '',
      subtitle: '',
      discount_label: 0,
      image_url: '',
      product_id: '',
      is_active: true,
    });
    setEditing(null);
    setShowForm(false);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (o: ShopOffer) => {
    setEditing(o);
    setForm({
      type: (o.type as 'custom' | 'product') || 'custom',
      title: o.title || '',
      subtitle: o.subtitle || '',
      discount_label: o.discount_label || 0,
      image_url: o.image_url || '',
      product_id: o.product_id || '',
      is_active: o.is_active !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim() || (lang === 'ar' ? 'عرض' : 'Offer'),
        subtitle: form.subtitle.trim() || null,
        discount_label: Math.min(100, Math.max(0, form.discount_label)),
        image_url: form.image_url.trim() || null,
        product_id: form.type === 'product' && form.product_id ? form.product_id : null,
        is_active: form.is_active,
      };
      if (editing) {
        const ok = await updateOffer(editing.id, payload);
        if (ok) resetForm();
      } else {
        const ok = await createOffer(payload);
        if (ok) resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteOffer(id);
    } finally {
      setDeletingId(null);
    }
  };

  const productName = (id: string) => products.find((p) => p.id === id)?.title || products.find((p) => p.id === id)?.name || id;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-black text-palma-muted uppercase tracking-[0.15em] text-xs flex items-center gap-3">
          <Tag className="w-5 h-5 text-palma-primary" />
          {lang === 'ar' ? 'قسم العروض في المتجر' : 'Shop offers section'} ({offers.length})
        </h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadOffers}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase"
          >
            {lang === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-palma-primary text-white rounded-xl text-xs font-black uppercase hover:bg-palma-navy transition-colors"
          >
            <Plus className="w-4 h-4" />
            {lang === 'ar' ? 'إضافة عرض' : 'Add offer'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-3xl border-2 border-palma-primary/20 shadow-soft">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-palma-navy">
              {editing ? (lang === 'ar' ? 'تعديل العرض' : 'Edit offer') : lang === 'ar' ? 'عرض جديد' : 'New offer'}
            </h4>
            <button type="button" onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'نوع العرض' : 'Type'}
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'custom' | 'product' })}
              >
                <option value="custom">{lang === 'ar' ? 'بطاقة مخصصة' : 'Custom card'}</option>
                <option value="product">{lang === 'ar' ? 'منتج' : 'Product'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'العنوان' : 'Title'} *
              </label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={lang === 'ar' ? 'مثال: خصم 20%' : 'e.g. 20% off'}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'وصف قصير' : 'Subtitle'}
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder={lang === 'ar' ? 'اطلب من التطبيق واحصل على خصم' : 'Order from app and get discount'}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'نسبة الخصم المعروضة (%)' : 'Discount label (%)'}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.discount_label || ''}
                onChange={(e) => setForm({ ...form, discount_label: parseInt(e.target.value, 10) || 0 })}
                placeholder="20"
              />
            </div>
            {form.type === 'product' && (
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'ar' ? 'المنتج' : 'Product'}
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                >
                  <option value="">{lang === 'ar' ? '— اختر منتجًا —' : '— Select product —'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {(p.title || p.name || p.id).slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'رابط الصورة (اختياري)' : 'Image URL (optional)'}
              </label>
              <input
                type="url"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="offer-active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-palma-primary"
              />
              <label htmlFor="offer-active" className="text-sm font-bold text-slate-700">
                {lang === 'ar' ? 'فعّال' : 'Active'}
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-palma-primary text-white font-black text-sm uppercase disabled:opacity-60"
              >
                {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : editing ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save') : lang === 'ar' ? 'إضافة' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {offersLoading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{t.common.loading}</p>
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
            <div
              key={o.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4 flex flex-col"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {o.type === 'product' ? (lang === 'ar' ? 'منتج' : 'Product') : lang === 'ar' ? 'مخصص' : 'Custom'}
                </span>
                {!o.is_active && (
                  <span className="text-[10px] font-bold text-amber-600 uppercase">{lang === 'ar' ? 'غير فعّال' : 'Inactive'}</span>
                )}
              </div>
              <h5 className="font-black text-palma-navy mb-1 line-clamp-2">{o.title}</h5>
              {o.subtitle && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{o.subtitle}</p>}
              {o.discount_label > 0 && (
                <p className="text-sm font-black text-emerald-600 mb-2">%{o.discount_label}</p>
              )}
              {o.type === 'product' && o.product_id && (
                <p className="text-xs text-slate-400 truncate">{productName(o.product_id)}</p>
              )}
              <div className="mt-auto flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => openEdit(o)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(o.id)}
                  disabled={deletingId === o.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold disabled:opacity-50"
                >
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
