/**
 * Customer cart tab: cart items list and checkout CTA.
 * Lazy-loaded when the cart tab is active.
 */

import React from 'react';
import { CartItem } from '../../types';
import type { Language } from '../../translations';
import { ArrowRight } from 'lucide-react';
import { CartItemRow } from '../../components/CustomerShared';

export interface CustomerCartTabProps {
  lang: Language;
  t: Record<string, any> & { cart: { title: string; empty: string; total: string } };
  cart: CartItem[];
  selectedCartIds: Set<string>;
  selectedCartItems: CartItem[];
  totalAmount: number;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string, productName?: string) => void;
  onProceedToCheckout?: (items: CartItem[]) => void;
}

export const CustomerCartTab: React.FC<CustomerCartTabProps> = ({
  lang,
  t,
  cart,
  selectedCartIds,
  selectedCartItems,
  totalAmount,
  onToggleSelection,
  onSelectAll,
  onUpdateQuantity,
  onRemove,
  onProceedToCheckout,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="font-heading text-xl sm:text-2xl font-black text-palma-navy tracking-tight">{t.cart.title}</h2>
      {cart.length === 0 ? (
        <div className="dashboard-empty py-16">
          <span className="text-4xl block mb-4 grayscale opacity-60">🛒</span>
          <p className="text-slate-500 font-semibold text-sm">{t.cart.empty}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            {cart.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-xs font-bold text-palma-primary hover:underline"
                >
                  {lang === 'ar' ? 'تحديد الكل' : 'Select all'}
                </button>
                <span className="text-[10px] font-bold text-slate-500">
                  {selectedCartItems.length} / {cart.length} {lang === 'ar' ? 'محدد' : 'selected'}
                </span>
              </div>
            )}
            {cart.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                isSelected={selectedCartIds.has(item.id)}
                showCheckbox={cart.length > 1}
                onToggleSelection={onToggleSelection}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
                lang={lang}
              />
            ))}
          </div>

          <div className="bg-white border border-palma-border p-8 rounded-[2.5rem] shadow-card hover:shadow-card-hover transition-shadow flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-1 text-center md:text-left rtl:md:text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.cart.total}</p>
              <h3 className="text-4xl font-black text-palma-navy tracking-tight">₪{totalAmount}</h3>
              {cart.length > 1 && (
                <p className="text-[10px] text-slate-500">
                  {selectedCartItems.length} {lang === 'ar' ? 'منتج محدد' : 'items selected'}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  if (selectedCartItems.length === 0) return;
                  onProceedToCheckout?.(selectedCartItems);
                }}
                disabled={selectedCartItems.length === 0}
                className="btn-primary w-full md:w-auto px-10 py-5 text-[11px] uppercase tracking-widest active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'ar' ? 'متابعة للدفع' : 'Proceed to Checkout'}{' '}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
