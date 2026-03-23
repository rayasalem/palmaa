/**
 * Merchant products tab: add/edit form and product list.
 * Lazy-loaded when the products tab is active.
 */

import React from 'react';
import { Product, PRODUCT_CATEGORIES, CATEGORY_EMOJI } from '../../types';
import type { MerchantDashboardResponse } from '../../services/merchantDashboardService';
import type { Language } from '../../translations';
import { Package, Plus, Edit, Trash2, Image as ImageIcon, Box, ExternalLink, Eye, EyeOff, X } from 'lucide-react';
import { ProductConditionBadge } from '../../components/ProductConditionBadge';
import { secureImageSrc, setImageToPlaceholder } from '../../utils/secureUrl';

const MERCH_PREVIEW_FALLBACK = 'https://placehold.co/200x200?text=صورة+المنتج';
const MERCH_LIST_FALLBACK = 'https://placehold.co/200x200?text=No+Image';

export interface MerchantProductsTabProps {
  lang: Language;
  t: Record<string, any> & {
    common: Record<string, string>;
    product?: Record<string, string>;
    categories?: Record<string, string>;
  };
  dashboardData: MerchantDashboardResponse | null;
  products: Product[];
  productForm: Partial<Product>;
  setProductForm: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  loading: boolean;
  isEditing: boolean;
  resetForm: () => void;
  handleProductSubmit: (e: React.FormEvent) => void;
  handleRemoveImage: (index: number) => void;
  uploadQueue: File[];
  setUploadQueue: React.Dispatch<React.SetStateAction<File[]>>;
  isUploading: boolean;
  tagsInput: string;
  setTagsInput: React.Dispatch<React.SetStateAction<string>>;
  handleEditClick: (product: Product) => void;
  handleToggleStatus: (product: Product) => void;
  handleDeleteProduct: (id: string, name?: string) => void;
  onViewProduct?: (id: string) => void;
}

export const MerchantProductsTab: React.FC<MerchantProductsTabProps> = ({
  lang,
  t,
  dashboardData,
  products,
  productForm,
  setProductForm,
  loading,
  isEditing,
  resetForm,
  handleProductSubmit,
  handleRemoveImage,
  uploadQueue,
  setUploadQueue,
  isUploading,
  tagsInput,
  setTagsInput,
  handleEditClick,
  handleToggleStatus,
  handleDeleteProduct,
  onViewProduct,
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
    <div className="xl:col-span-1">
      {dashboardData && !dashboardData.subscription.is_active && !isEditing && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
          {lang === 'ar'
            ? 'لا يمكن إضافة منتجات جديدة حتى تجديد الاشتراك.'
            : lang === 'he'
              ? 'לא ניתן להוסיף מוצרים עד לחידוש המנוי.'
              : 'You cannot add new products until you renew your subscription.'}
        </div>
      )}
      <div className="dashboard-card dashboard-card-body max-xl:static xl:sticky xl:top-28 transition-all">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-palma-navy rounded-xl text-white shadow-lg shadow-soft">
              {isEditing ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-palma-navy leading-none">
                {isEditing
                  ? lang === 'ar'
                    ? 'تعديل منتج'
                    : lang === 'he'
                      ? 'עריכת מוצר'
                      : 'Edit Product'
                  : t.common.addProduct}
              </h3>
              <p className="text-xs text-palma-muted font-bold mt-1 uppercase tracking-wider">
                {t.common.createListing}
              </p>
            </div>
          </div>
          {isEditing && (
            <button onClick={resetForm} className="text-xs text-red-500 font-bold hover:underline">
              {t.common.cancel}
            </button>
          )}
        </div>

        <form onSubmit={handleProductSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {t.common.productName} *
            </label>
            <input
              required
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm"
              placeholder="e.g. Premium Cotton Shirt"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {t.common.price} * ({lang === 'ar' ? 'موجب فقط' : 'Positive only'})
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 pl-10 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm"
                  value={productForm.price !== undefined && productForm.price !== null ? productForm.price : ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    const safe = Number.isFinite(v) ? Math.max(0, v) : 0;
                    setProductForm({ ...productForm, price: safe });
                  }}
                />
                <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">₪</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {t.common.stock} * ({lang === 'ar' ? 'موجب فقط' : 'Positive only'})
              </label>
              <input
                type="number"
                required
                min={0}
                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm"
                value={productForm.stock !== undefined && productForm.stock !== null ? productForm.stock : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  const safe = Number.isFinite(v) ? Math.max(0, v) : 0;
                  setProductForm({ ...productForm, stock: safe });
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {lang === 'ar' ? 'حالة المنتج' : lang === 'he' ? 'סטטוס המוצר' : 'Product condition'} *
            </label>
            <select
              required
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm appearance-none cursor-pointer"
              value={productForm.condition || 'new'}
              onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
            >
              <option value="new">{lang === 'ar' ? 'جديد' : lang === 'he' ? 'חדש' : 'New'}</option>
              <option value="used_like_new">
                {lang === 'ar' ? 'مستعمل – كالجديد' : lang === 'he' ? 'משומש – כמו חדש' : 'Used – Like New'}
              </option>
              <option value="used_good">
                {lang === 'ar' ? 'مستعمل – حالة جيدة' : lang === 'he' ? 'משומש – מצב טוב' : 'Used – Good'}
              </option>
              <option value="refurbished">{lang === 'ar' ? 'مجدّد' : lang === 'he' ? 'מחודש' : 'Refurbished'}</option>
            </select>
          </div>
          {/* خصم على المنتج */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="product-discount-active"
                checked={Boolean(productForm.is_discount_active)}
                onChange={(e) =>
                  setProductForm({ ...productForm, is_discount_active: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-palma-primary focus:ring-palma-primary"
              />
              <label htmlFor="product-discount-active" className="text-sm font-bold text-slate-700 cursor-pointer">
                {lang === 'ar' ? 'تفعيل خصم على هذا المنتج' : lang === 'he' ? 'הפעל הנחה על המוצר' : 'Add discount for this product'}
              </label>
            </div>
            {productForm.is_discount_active && (
              <>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {lang === 'ar' ? 'نوع الخصم' : 'Discount type'}
                  </label>
                  <select
                    className="w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10"
                    value={productForm.discount_type || 'PERCENT'}
                    onChange={(e) =>
                      setProductForm({ ...productForm, discount_type: e.target.value as 'PERCENT' | 'AMOUNT' })
                    }
                  >
                    <option value="PERCENT">{lang === 'ar' ? 'نسبة مئوية %' : 'Percentage %'}</option>
                    <option value="AMOUNT">{lang === 'ar' ? 'مبلغ ثابت (₪)' : 'Fixed amount (₪)'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {productForm.discount_type === 'AMOUNT'
                      ? lang === 'ar'
                        ? 'قيمة الخصم (₪)'
                        : 'Discount amount (₪)'
                      : lang === 'ar'
                        ? 'نسبة الخصم (%)'
                        : 'Discount %'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={productForm.discount_type === 'PERCENT' ? 100 : undefined}
                      step={productForm.discount_type === 'PERCENT' ? 1 : 0.01}
                      className="w-full rounded-xl border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-bold outline-none focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10"
                      value={productForm.discount_value ?? ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        const raw = Number.isFinite(v) ? Math.max(0, v) : 0;
                        const capped =
                          productForm.discount_type === 'PERCENT' ? Math.min(100, raw) : raw;
                        setProductForm({ ...productForm, discount_value: capped });
                      }}
                      placeholder={productForm.discount_type === 'PERCENT' ? 'مثلاً 20' : 'مثلاً 5'}
                    />
                    <span className="absolute right-4 top-3 text-slate-400 text-sm font-bold">
                      {productForm.discount_type === 'PERCENT' ? '%' : '₪'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {lang === 'ar' ? 'انتهاء الخصم (اختياري)' : 'Discount ends (optional)'}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10"
                    value={
                      productForm.discount_ends_at
                        ? String(productForm.discount_ends_at).slice(0, 10)
                        : ''
                    }
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        discount_ends_at: e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
                      })
                    }
                  />
                </div>
                {/* معاينة منظر المنتج — يتغير التصميم عند وجود خصم فعلي */}
                {(() => {
                  const basePrice = Math.max(0, Number(productForm.price) || 0);
                  const dType = productForm.discount_type || 'PERCENT';
                  const dVal = Math.max(0, Number(productForm.discount_value) || 0);
                  const discountAmount =
                    dType === 'PERCENT' ? (basePrice * Math.min(100, dVal)) / 100 : Math.min(basePrice, dVal);
                  const finalPrice = Math.max(0, basePrice - discountAmount);
                  const percentLabel =
                    basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;
                  const hasRealDiscount = percentLabel > 0 && finalPrice < basePrice;
                  const img =
                    productForm.images && productForm.images.length > 0
                      ? productForm.images[0]
                      : 'https://placehold.co/200x200?text=صورة+المنتج';
                  return (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                        {lang === 'ar' ? 'معاينة منظر المنتج للزبون' : 'How the product will look'}
                      </p>
                      {!hasRealDiscount && (
                        <p className="text-xs text-amber-600 font-medium mb-2">
                          {lang === 'ar'
                            ? 'أدخل نسبة أو مبلغ الخصم أعلاه لرؤية منظر المنتج مع الخصم.'
                            : 'Enter discount % or amount above to see the product with discount.'}
                        </p>
                      )}
                      <div
                        className={`bg-white rounded-2xl overflow-hidden max-w-[220px] shadow-sm ${
                          hasRealDiscount ? 'border-2 border-red-200 ring-2 ring-red-100' : 'border border-slate-200'
                        }`}
                      >
                        <div className="relative aspect-square bg-slate-100">
                          <img src={img} alt="" className="w-full h-full object-cover" onError={setImageToPlaceholder} />
                          {hasRealDiscount && (
                            <span className="absolute top-2 right-2 bg-red-600 text-white px-2.5 py-1 rounded-md text-xs font-black shadow-lg">
                              %{percentLabel} {lang === 'ar' ? 'خصم' : 'off'}
                            </span>
                          )}
                          {!hasRealDiscount && basePrice > 0 && (
                            <span className="absolute top-2 right-2 bg-slate-600 text-white px-2.5 py-1 rounded-md text-xs font-bold">
                              {lang === 'ar' ? 'بدون خصم' : 'No discount'}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-bold text-slate-800 line-clamp-2 mb-2">
                            {productForm.name || (lang === 'ar' ? 'اسم المنتج' : 'Product name')}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasRealDiscount ? (
                              <>
                                <span className="text-sm font-black text-emerald-600">₪{finalPrice.toFixed(2)}</span>
                                <span className="text-xs text-slate-400 line-through">₪{basePrice.toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-sm font-black text-slate-800">₪{basePrice.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {t.common.category} *
            </label>
            <select
              required
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm appearance-none cursor-pointer"
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
            >
              <option value="" disabled>
                {t.common.category}...
              </option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_EMOJI[cat] ? `${CATEGORY_EMOJI[cat]} ` : ''}
                  {t.categories?.[cat] || cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {t.common.description}
            </label>
            <textarea
              required
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:border-palma-primary focus:ring-2 focus:ring-palma-primary/10 transition shadow-sm resize-none"
              rows={3}
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            />
          </div>
          <div>
            <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {(t.product && t.product.image) || 'Image'} (Max 5) *
            </span>
            <p className="text-xs text-slate-400 mb-2">
              {lang === 'ar'
                ? 'مسموح حتى ٥ صور، كل صورة أقل من ٢ ميجا وبصيغة JPG أو PNG أو WebP.'
                : lang === 'he'
                  ? 'ניתן להעלות עד 5 תמונות, כל תמונה עד 2MB בפורמט JPG, PNG או WebP.'
                  : 'You can upload up to 5 images, each under 2MB in JPG, PNG, or WebP format.'}
            </p>
            <input
              id="merchant-product-file-upload"
              type="file"
              multiple
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,image/*"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) setUploadQueue(Array.from(files).slice(0, 5));
                e.target.value = '';
              }}
            />
            <label
              htmlFor="merchant-product-file-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 min-h-[120px] sm:min-h-0 text-center hover:bg-slate-50 hover:border-palma-primary/50 active:bg-palma-primaryLight/30 transition cursor-pointer group"
            >
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-2 text-palma-muted group-hover:bg-white group-hover:text-palma-primary group-hover:shadow-md transition-all">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-400 group-hover:text-palma-navy transition-colors">
                {uploadQueue.length > 0 ? `${uploadQueue.length} ${t.common.filesSelected}` : t.common.uploadHint}
              </p>
            </label>
            {productForm.images && productForm.images.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {productForm.images.map((url, idx) => (
                  <div
                    key={idx}
                    className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 relative group shrink-0"
                  >
                    <img
                      src={secureImageSrc(url)}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      alt=""
                      onError={setImageToPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition touch-manipulation"
                      aria-label={lang === 'ar' ? 'حذف الصورة' : 'Remove image'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || (!isEditing && !!dashboardData && !dashboardData.subscription.is_active)}
            className="btn-primary w-full py-4 text-xs uppercase tracking-widest active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
                {t.common.uploading}
              </>
            ) : (
              <>{isEditing ? t.common.save : t.common.addProduct}</>
            )}
          </button>
        </form>
      </div>
    </div>
    <div className="xl:col-span-2">
      <div className="bg-white rounded-3xl shadow-card border border-palma-border overflow-hidden flex flex-col h-full hover:shadow-card-hover transition-shadow">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-palma-soft rounded-lg">
              <Box className="w-5 h-5 text-palma-navy" />
            </div>
            <h3 className="font-bold text-palma-navy text-lg">{t.common.inventory}</h3>
          </div>
          <span className="text-xs font-black text-palma-primary bg-palma-primary/5 px-3 py-2 rounded-lg border border-palma-primary/10 whitespace-nowrap">
            {products.length} {t.common.items}
          </span>
        </div>
        {loading && products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-palma-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-palma-navy text-base mb-1">{t.common.yourInventoryEmpty}</p>
            <p className="text-xs text-slate-400">{t.common.addFirstProduct}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 overflow-y-auto max-h-[800px] p-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="p-3 sm:p-4 rounded-2xl flex items-center gap-4 sm:gap-6 hover:bg-slate-50 transition-colors group"
              >
                <div
                  className={`h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border border-slate-100 shrink-0 relative shadow-sm cursor-pointer ${!product.isActive ? 'grayscale' : ''}`}
                  onClick={() => onViewProduct && onViewProduct(product.id)}
                >
                  <img
                    src={secureImageSrc(
                      product.images?.[0] || product.imageUrl || product.image_url,
                      MERCH_LIST_FALLBACK
                    )}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    alt=""
                    onError={setImageToPlaceholder}
                  />
                  {!product.isActive && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                      <EyeOff className="text-white w-6 h-6 drop-shadow-md" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  <div className="sm:col-span-2">
                    <h4
                      className="font-bold text-palma-navy text-sm sm:text-base truncate mb-1 cursor-pointer hover:text-palma-primary"
                      onClick={() => onViewProduct && onViewProduct(product.id)}
                    >
                      {product.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        {(CATEGORY_EMOJI[product.category] || '') +
                          ' ' +
                          (t.categories?.[product.category] || product.category)}
                      </p>
                      <ProductConditionBadge condition={product.condition || 'new'} lang={lang} />
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-center">
                    {(() => {
                      const baseP = Number(product.price ?? product.price_ils) || 0;
                      const finalP = (product as any).final_price != null ? Number((product as any).final_price) : baseP;
                      const hasDisc = finalP < baseP && baseP > 0;
                      const pct = (product as any).discount_percent ?? (hasDisc && baseP > 0 ? Math.round((1 - finalP / baseP) * 100) : 0);
                      return (
                        <>
                          {hasDisc ? (
                            <span className="text-sm sm:text-base font-black text-emerald-600">
                              ₪{finalP.toFixed(2)}
                              <span className="text-xs text-slate-400 font-normal line-through mr-1">₪{baseP.toFixed(2)}</span>
                            </span>
                          ) : (
                            <span className="text-sm sm:text-base font-black text-palma-navy">₪{baseP.toFixed(2)}</span>
                          )}
                          {hasDisc && pct > 0 && (
                            <span className="text-xs font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-md mt-1 inline-flex">
                              %{pct} {lang === 'ar' ? 'خصم' : 'off'}
                            </span>
                          )}
                        </>
                      );
                    })()}
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md mt-1 inline-flex ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                    >
                      {product.stock > 0 ? `${product.stock} ${t.common.available}` : t.common.outOfStock}
                    </span>
                  </div>
                  <div className="flex justify-end items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {onViewProduct && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProduct(product.id);
                        }}
                        className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-palma-primary hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation"
                        title={lang === 'ar' ? 'عرض التفاصيل' : lang === 'he' ? 'צפה בפרטים' : 'View details'}
                      >
                        <ExternalLink className="w-4 h-4 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(product);
                      }}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-palma-navy hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation"
                      title={
                        product.isActive
                          ? lang === 'ar'
                            ? 'إلغاء التفعيل'
                            : lang === 'he'
                              ? 'בטל הפעלה'
                              : 'Deactivate'
                          : lang === 'ar'
                            ? 'تفعيل'
                            : lang === 'he'
                              ? 'הפעל'
                              : 'Activate'
                      }
                    >
                      {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(product);
                      }}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation"
                      title={t.common.edit}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id, product.name || product.title);
                      }}
                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-2 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-slate-100 touch-manipulation"
                      title={t.common.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
