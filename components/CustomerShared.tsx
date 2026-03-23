/**
 * Shared UI components for CustomerView and customer tab subcomponents.
 * Used by CustomerShopTab, CustomerCartTab, and checkout modal in CustomerView.
 */

import React from 'react';
import { Product, CartItem } from '../types';
import { marketStore } from '../store';
import type { Language } from '../translations';
import { ArrowRight, Building, Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductConditionBadge } from './ProductConditionBadge';
import { secureImageSrc, setImageToPlaceholder } from '../utils/secureUrl';

const IMG_FALLBACK = 'https://placehold.co/400x400?text=No+Image';
const IMG_FALLBACK_SM = 'https://placehold.co/200x200?text=No+Image';

export interface ShippingInputGroupProps {
  label: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  type?: string;
  placeholder?: string;
  options?: React.ReactNode;
  value: string | number | undefined;
  error?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  lang: Language;
  disabled?: boolean;
}
export const ShippingInputGroup = React.memo(function ShippingInputGroup({
  label,
  name,
  icon: Icon,
  required = false,
  type = 'text',
  placeholder,
  options,
  value,
  error = false,
  onChange,
  lang,
  disabled = false,
}: ShippingInputGroupProps) {
  const inputValue = value ?? '';
  const displayValue = type === 'select' ? inputValue : String(inputValue);
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-xs font-black uppercase text-palma-muted tracking-widest flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${lang === 'en' ? 'left-4' : 'right-4'} text-slate-400 group-focus-within:text-palma-primary transition-colors`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {type === 'select' ? (
          <select
            name={name}
            required={required}
            className={`w-full ${lang === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} py-3.5 bg-slate-50 border ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl text-sm font-bold text-palma-navy outline-none focus:bg-white focus:border-palma-primary focus:ring-4 focus:ring-palma-primary/10 transition-all appearance-none cursor-pointer`}
            value={displayValue}
            onChange={onChange}
            disabled={disabled}
          >
            {options}
          </select>
        ) : (
          <input
            type={type === 'email' ? 'email' : 'text'}
            name={name}
            required={required}
            placeholder={placeholder}
            inputMode={name === 'phone' || name === 'phone2' ? 'tel' : undefined}
            maxLength={name === 'phone' || name === 'phone2' ? 20 : undefined}
            className={`w-full ${lang === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} py-3.5 bg-slate-50 border ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl text-sm font-bold text-palma-navy outline-none focus:bg-white focus:border-palma-primary focus:ring-4 focus:ring-palma-primary/10 transition-all placeholder:text-slate-400`}
            value={displayValue}
            onChange={onChange}
          />
        )}
        {type === 'select' && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${lang === 'en' ? 'right-4' : 'left-4'} text-slate-400 pointer-events-none`}
          >
            <ArrowRight className="w-4 h-4 rotate-90" />
          </div>
        )}
      </div>
    </div>
  );
});

export interface DistrictVillageItem {
  id: string;
  name: string;
  cityId?: string;
  regionId?: string;
}

export interface DistrictVillageSelectProps {
  /** المحافظات */
  districts: DistrictVillageItem[];
  /** كل القرى (يتم الفلترة حسب districtId) */
  villages: DistrictVillageItem[];
  districtId: string | undefined;
  villageId: string | undefined;
  villageName?: string;
  onDistrictChange: (districtId: string, districtName: string) => void;
  onVillageChange: (villageId: string, villageName: string) => void;
  errorDistrict?: boolean;
  errorVillage?: boolean;
  lang: Language;
  required?: boolean;
  /** Placeholder for village search */
  villageSearchPlaceholder?: string;
  disabled?: boolean;
}

export const DistrictVillageSelect = React.memo(function DistrictVillageSelect({
  districts,
  villages,
  districtId,
  villageId,
  villageName,
  onDistrictChange,
  onVillageChange,
  errorDistrict = false,
  errorVillage = false,
  lang,
  required = true,
  villageSearchPlaceholder,
  disabled = false,
}: DistrictVillageSelectProps) {
  const [villageSearch, setVillageSearch] = React.useState('');
  const [villageDropdownOpen, setVillageDropdownOpen] = React.useState(false);
  const villageDropdownRef = React.useRef<HTMLDivElement>(null);

  const villagesForDistrict = React.useMemo(() => {
    if (!districtId) return [];
    return villages.filter((v) => String(v.cityId ?? '') === String(districtId));
  }, [villages, districtId]);

  const filteredVillages = React.useMemo(() => {
    if (!villageSearch.trim()) return villagesForDistrict;
    const s = villageSearch.trim().toLowerCase();
    return villagesForDistrict.filter((v) => (v.name || '').toLowerCase().includes(s));
  }, [villagesForDistrict, villageSearch]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (villageDropdownRef.current && !villageDropdownRef.current.contains(e.target as Node)) {
        setVillageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaceholder =
    villageSearchPlaceholder ?? (lang === 'ar' ? 'ابحث عن القرية أو الحي...' : 'Search village or district...');
  const selectDistrictPlaceholder = lang === 'ar' ? 'اختر المحافظة' : 'Select district';
  const selectVillagePlaceholder = lang === 'ar' ? 'اختر القرية أولاً' : 'Select district first';
  const selectVillagePlaceholderAfter = lang === 'ar' ? 'اختر القرية' : 'Select village';

  return (
    <div className="grid md:grid-cols-2 gap-5 w-full">
      <div className="space-y-1.5 w-full">
        <label className="text-xs font-black uppercase text-palma-muted tracking-widest flex items-center gap-1">
          {lang === 'ar' ? 'المحافظة' : 'District'} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
          <div className={`absolute top-1/2 -translate-y-1/2 z-10 ${lang === 'en' ? 'left-4' : 'right-4'} text-slate-400`}>
            <Building className="w-5 h-5" />
          </div>
          <select
            value={districtId ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              const d = districts.find((x) => String(x.id) === String(id));
              if (d) onDistrictChange(id, d.name);
            }}
            disabled={disabled}
            className={`w-full ${lang === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} py-3.5 bg-slate-50 border ${errorDistrict ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl text-sm font-bold text-palma-navy outline-none focus:bg-white focus:border-palma-primary focus:ring-4 focus:ring-palma-primary/10 transition-all appearance-none cursor-pointer`}
          >
            <option value="">{selectDistrictPlaceholder}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'en' ? 'right-4' : 'left-4'} text-slate-400 pointer-events-none`}>
            <ArrowRight className="w-4 h-4 rotate-90" />
          </div>
        </div>
        {errorDistrict && (
          <p className="text-xs text-red-500 font-medium">{lang === 'ar' ? 'يرجى اختيار المحافظة' : 'Please select district'}</p>
        )}
      </div>

      <div ref={villageDropdownRef} className="space-y-1.5 w-full">
        <label className="text-xs font-black uppercase text-palma-muted tracking-widest flex items-center gap-1">
          {lang === 'ar' ? 'القرية / الحي' : 'Village / District'} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
          <div className={`absolute top-1/2 -translate-y-1/2 z-10 ${lang === 'en' ? 'left-4' : 'right-4'} text-slate-400`}>
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            readOnly={!districtId}
            placeholder={
              !districtId ? selectVillagePlaceholder : villageDropdownOpen ? searchPlaceholder : (villageName || selectVillagePlaceholderAfter)
            }
            value={villageDropdownOpen ? villageSearch : (villageName || '')}
            onChange={(e) => {
              setVillageSearch(e.target.value);
              if (!villageDropdownOpen) setVillageDropdownOpen(true);
            }}
            onFocus={() => {
              if (districtId) {
                setVillageDropdownOpen(true);
                setVillageSearch('');
              }
            }}
            disabled={disabled}
            className={`w-full ${lang === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} py-3.5 bg-slate-50 border ${errorVillage ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl text-sm font-bold text-palma-navy outline-none focus:bg-white focus:border-palma-primary focus:ring-4 focus:ring-palma-primary/10 transition-all placeholder:text-slate-400 cursor-pointer`}
          />
          {villageDropdownOpen && districtId && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl py-2">
              {filteredVillages.length === 0 ? (
                <li className="px-4 py-3 text-slate-500 text-sm">{lang === 'ar' ? 'لا توجد نتائج' : 'No results'}</li>
              ) : (
                filteredVillages.map((v) => (
                  <li
                    key={v.id}
                    role="option"
                    tabIndex={0}
                    className={`px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-palma-primary/10 ${lang === 'ar' ? 'text-right' : 'text-left'} ${String(villageId) === String(v.id) ? 'bg-palma-primary/10 text-palma-navy' : 'text-slate-700'}`}
                    onClick={() => {
                      onVillageChange(v.id, v.name);
                      setVillageSearch('');
                      setVillageDropdownOpen(false);
                    }}
                  >
                    {v.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {errorVillage && (
          <p className="text-xs text-red-500 font-medium">{lang === 'ar' ? 'يرجى اختيار القرية أو الحي' : 'Please select village'}</p>
        )}
      </div>
    </div>
  );
});

export interface ShopProductCardProps {
  product: Product;
  lang: Language;
  t: Record<string, any> & { product: { addToCart: string }; common?: Record<string, string> };
  onViewProduct?: (id: string) => void;
  onViewProfile?: (profileId: string) => void;
  onAddToCart: (product: Product) => void;
  isAddingToCart?: boolean;
   /** اختياري: فتح نافذة عرض سريع بدون تغيير التنقل */
  onQuickView?: (product: Product) => void;
}
export const ShopProductCard = React.memo(function ShopProductCard({
  product: p,
  lang,
  t,
  onViewProduct,
  onViewProfile,
  onAddToCart,
  isAddingToCart,
  onQuickView,
}: ShopProductCardProps) {
  const merchantId = p.merchant_id || p.merchantId || '';
  const merchantName = marketStore.getMerchantNameByUserId(merchantId);
  const displayImage = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
  const basePrice = p.price || p.price_ils || 0;
  const finalPrice = (p as any).final_price != null ? (p as any).final_price : basePrice;
  const hasDiscount = finalPrice < basePrice;
  const discountPercent =
    (p as any).discount_percent != null
      ? Number((p as any).discount_percent)
      : basePrice > 0 && finalPrice < basePrice
        ? Math.round((1 - finalPrice / basePrice) * 100)
        : undefined;
  const discountEndsAt =
    (p as any).discount_ends_at || (p as any).discountEndsAt || (p as any).flash_sale_ends_at;
  let flashLabel: string | null = null;
  if (discountEndsAt && hasDiscount) {
    const end = new Date(discountEndsAt);
    const now = new Date();
    if (end.getTime() > now.getTime()) {
      const diffMs = end.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays > 0) {
        flashLabel =
          lang === 'ar'
            ? `عرض لفترة محدودة • ينتهي خلال ${diffDays} يوم`
            : lang === 'he'
              ? `הטבה לזמן מוגבל • מסתיים בעוד ${diffDays} ימים`
              : `Limited time offer • Ends in ${diffDays} days`;
      } else if (diffHours > 0) {
        flashLabel =
          lang === 'ar'
            ? `عرض اليوم فقط • ينتهي خلال ${diffHours} ساعة`
            : lang === 'he'
              ? `מבצע להיום בלבד • מסתיים בעוד ${diffHours} שעות`
              : `Today only • Ends in ${diffHours} hours`;
      } else if (diffMinutes > 0) {
        flashLabel =
          lang === 'ar'
            ? `عرض سريع • ينتهي خلال ${diffMinutes} دقيقة`
            : lang === 'he'
              ? `מבצע מהיר • מסתיים בעוד ${diffMinutes} דקות`
              : `Flash deal • Ends in ${diffMinutes} minutes`;
      }
    }
  }
  return (
    <div className="dashboard-card flex flex-col p-0 overflow-hidden group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <div
        className="aspect-[4/5] overflow-hidden bg-slate-100 relative cursor-pointer"
        onClick={() => onViewProduct?.(p.id)}
      >
        <img
          loading="lazy"
          src={displayImage}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={p.name}
          onError={setImageToPlaceholder}
        />
        {/* شارة الخصم بأسلوب sdclubs — مستطيل أحمر واضح */}
        {hasDiscount && (
          <div
            className={`absolute top-3 ${lang === 'en' ? 'right-3' : 'left-3'} bg-red-600 text-white px-2.5 py-1 rounded-sm text-xs font-black shadow-lg`}
          >
            {discountPercent != null && discountPercent > 0 ? (
              <span>%{discountPercent}-</span>
            ) : (
              <span>{lang === 'ar' ? 'تخفيضات!' : lang === 'he' ? 'הנחות!' : 'Sale!'}</span>
            )}
          </div>
        )}
        <div
          className={`absolute top-3 ${lang === 'en' ? 'left-3' : 'right-3'} bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-palma-navy border border-slate-200/80`}
        >
          {hasDiscount ? (
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-red-600">₪{finalPrice}</span>
              <span className="line-through text-[11px] text-slate-400">₪{basePrice}</span>
            </span>
          ) : (
            <>₪{basePrice}</>
          )}
        </div>
        {flashLabel && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-600/95 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-lg flex items-center justify-between gap-2">
            <span className="truncate">{flashLabel}</span>
            <span className="text-xs">⏳</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex-1">
          <div className="mb-1">
            <ProductConditionBadge condition={p.condition || 'new'} lang={lang} />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (merchantId && onViewProfile) onViewProfile(merchantId);
            }}
            className="text-xs font-black text-palma-muted uppercase tracking-widest mb-1 block text-left hover:text-palma-primary hover:underline transition-colors"
          >
            {merchantName || (lang === 'ar' ? 'التاجر' : 'Merchant')}
          </button>
          <h4
            className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 cursor-pointer"
            onClick={() => onViewProduct?.(p.id)}
          >
            {p.name}
          </h4>
        </div>
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(p);
            }}
            className="w-full mb-2 py-2 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            {lang === 'ar' ? 'عرض سريع' : lang === 'he' ? 'תצוגה מהירה' : 'Quick View'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onAddToCart(p)}
          disabled={isAddingToCart}
          className="btn-primary w-full py-3 text-xs uppercase tracking-widest active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
        >
          {isAddingToCart ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
              {lang === 'ar' ? 'جاري الإضافة...' : lang === 'he' ? 'מוסיף...' : 'Adding...'}
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" /> {t.product.addToCart}
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export interface CartItemRowProps {
  item: CartItem;
  isSelected: boolean;
  showCheckbox: boolean;
  onToggleSelection: (id: string) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string, productName?: string) => void;
  lang: Language;
}
export const CartItemRow = React.memo(function CartItemRow({
  item,
  isSelected,
  showCheckbox,
  onToggleSelection,
  onUpdateQuantity,
  onRemove,
  lang,
}: CartItemRowProps) {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex items-center gap-4 sm:gap-6 group hover:border-palma-primary/20 transition-all">
      {showCheckbox ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(item.id)}
          className="w-5 h-5 rounded border-slate-300 text-palma-primary focus:ring-palma-primary shrink-0"
        />
      ) : null}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
        <img
          src={secureImageSrc(item.images?.[0] || item.imageUrl || item.image_url, IMG_FALLBACK_SM)}
          loading="lazy"
          className="w-full h-full object-cover"
          alt=""
          onError={setImageToPlaceholder}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate">{item.name}</h4>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="text-xs font-black text-palma-muted uppercase tracking-widest">{item.category}</p>
          <ProductConditionBadge condition={item.condition || 'new'} lang={lang} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100">
            <button
              onClick={() => onUpdateQuantity(item.id, -1)}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-sm font-black text-emerald-600">
            ₪{(item.price || item.price_ils || 0) * item.quantity}
          </span>
        </div>
      </div>
      <button
        onClick={() => onRemove(item.id, item.name || item.title)}
        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
});

export interface CategoryPillProps {
  category: string;
  active: boolean;
  label: string;
  onSelect: (category: string) => void;
}
export const CategoryPill = React.memo(function CategoryPill({ category, active, label, onSelect }: CategoryPillProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category)}
      className={`dashboard-filter-pill ${
        active
          ? 'bg-palma-primary text-white border-palma-primary'
          : 'text-slate-500 hover:text-palma-navy hover:bg-white border border-transparent'
      }`}
    >
      {label}
    </button>
  );
});
