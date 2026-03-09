/**
 * Shared UI components for CustomerView and customer tab subcomponents.
 * Used by CustomerShopTab, CustomerCartTab, and checkout modal in CustomerView.
 */

import React from 'react';
import { Product, CartItem } from '../types';
import { marketStore } from '../store';
import type { Language } from '../translations';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductConditionBadge } from './ProductConditionBadge';

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
  disabled = false
}: ShippingInputGroupProps) {
  const inputValue = value ?? '';
  const displayValue = type === 'select' ? inputValue : String(inputValue);
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-black uppercase text-palma-muted tracking-widest flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'en' ? 'left-4' : 'right-4'} text-slate-400 group-focus-within:text-palma-primary transition-colors`}>
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
          <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'en' ? 'right-4' : 'left-4'} text-slate-400 pointer-events-none`}>
            <ArrowRight className="w-4 h-4 rotate-90" />
          </div>
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
}
export const ShopProductCard = React.memo(function ShopProductCard({ product: p, lang, t, onViewProduct, onViewProfile, onAddToCart }: ShopProductCardProps) {
  const merchantId = p.merchant_id || p.merchantId || '';
  const merchantName = marketStore.getMerchantNameByUserId(merchantId);
  const displayImage = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
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
        />
        <div
          className={`absolute top-3 ${lang === 'en' ? 'right-3' : 'left-3'} bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm text-palma-navy border border-slate-200/80`}
        >
          ₪{p.price || p.price_ils}
        </div>
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
            className="text-[9px] font-black text-palma-muted uppercase tracking-widest mb-1 block text-left hover:text-palma-primary hover:underline transition-colors"
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
        <button
          onClick={() => onAddToCart(p)}
          className="btn-primary w-full py-3 text-[10px] uppercase tracking-widest active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-3.5 h-3.5" /> {t.product.addToCart}
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
export const CartItemRow = React.memo(function CartItemRow({ item, isSelected, showCheckbox, onToggleSelection, onUpdateQuantity, onRemove, lang }: CartItemRowProps) {
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
        <img src={item.images?.[0] || item.imageUrl || item.image_url || 'https://placehold.co/200x200?text=No+Image'} loading="lazy" className="w-full h-full object-cover" alt="" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate">{item.name}</h4>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="text-[10px] font-black text-palma-muted uppercase tracking-widest">{item.category}</p>
          <ProductConditionBadge condition={item.condition || 'new'} lang={lang} />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100">
            <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"><Minus className="w-3.5 h-3.5" /></button>
            <span className="text-xs font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
            <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <span className="text-sm font-black text-emerald-600">₪{(item.price || item.price_ils || 0) * item.quantity}</span>
        </div>
      </div>
      <button onClick={() => onRemove(item.id, item.name || item.title)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
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
        active ? 'bg-palma-primary text-white border-palma-primary' : 'text-slate-500 hover:text-palma-navy hover:bg-white border border-transparent'
      }`}
    >
      {label}
    </button>
  );
});
