/**
 * Customer cart tab — تصميم مشابه لصفحة سلة متجر (Grocery style).
 * Table: Product | Price | Quantity | Subtotal + Order Summary + Feature callouts.
 */

import React, { useState } from 'react';
import { CartItem } from '../../types';
import type { Language } from '../../translations';
import { ArrowRight, Minus, Plus, Trash2, Truck, CreditCard, Headphones } from 'lucide-react';

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
  onClearCart?: () => void;
  /** عند تطبيق القسيمة (نجاح/فشل) — اختياري لعرض رسالة */
  onCouponResult?: (success: boolean, message: string) => void;
}

/** أكواد قسائم معتمدة ونسبة الخصم (مثال: PALMA10 = 10%) */
const COUPON_CODES: Record<string, number> = { PALMA10: 10, WELCOME5: 5 };

function unitPrice(item: CartItem): number {
  const base = (item as any).final_price ?? item.price ?? item.price_ils ?? 0;
  return Number(base) || 0;
}

function subtotal(item: CartItem): number {
  return unitPrice(item) * (item.quantity || 1);
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
  onClearCart,
  onCouponResult,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const itemCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const shipping = 0;
  const taxes = 0;
  const couponPercent = appliedCoupon?.percent ?? 0;
  const couponDiscount = couponPercent > 0 ? (totalAmount * couponPercent) / 100 : 0;
  const displayTotal = totalAmount - couponDiscount + shipping + taxes;

  const homeLabel = lang === 'ar' ? 'الرئيسية' : lang === 'he' ? 'בית' : 'Home';
  const cartLabel = t.cart?.title || (lang === 'ar' ? 'السلة' : 'Shopping Cart');

  const handleApplyCoupon = () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) {
      onCouponResult?.(false, lang === 'ar' ? 'أدخل كود القسيمة' : 'Enter a coupon code');
      return;
    }
    const percent = COUPON_CODES[trimmed];
    if (!percent) {
      setAppliedCoupon(null);
      onCouponResult?.(false, lang === 'ar' ? 'كود القسيمة غير صالح' : 'Invalid coupon code');
      return;
    }
    setAppliedCoupon({ code: trimmed, percent });
    onCouponResult?.(
      true,
      lang === 'ar'
        ? `تم تطبيق خصم ${percent}% على السلة.`
        : lang === 'he'
          ? `הנחה של ${percent}% הופעלה על הסל.`
          : `A ${percent}% discount has been applied to your cart.`
    );
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <nav className="text-sm font-medium text-slate-500 mb-4" aria-label="Breadcrumb">
          <span>{homeLabel}</span>
          <span className="mx-2">/</span>
          <span className="text-palma-navy">{cartLabel}</span>
        </nav>
        <div className="dashboard-empty py-20 rounded-2xl bg-white border border-palma-border shadow-card text-center">
          <span className="text-5xl block mb-4 grayscale opacity-60">🛒</span>
          <h2 className="font-heading text-xl font-black text-palma-navy mb-2">{cartLabel}</h2>
          <p className="text-slate-500 font-semibold text-sm">{t.cart.empty}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Breadcrumb */}
      <nav className="text-sm font-medium text-slate-500 mb-2" aria-label="Breadcrumb">
        <span>{homeLabel}</span>
        <span className="mx-2">/</span>
        <span className="text-palma-navy font-bold">{cartLabel}</span>
      </nav>

      <h1 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy tracking-tight mb-8 text-center sm:text-right">
        {cartLabel}
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-palma-border shadow-card overflow-hidden">
            {/* Table header — خلفية صفراء/ذهبية خفيفة مثل التصميم */}
            <div className="grid grid-cols-12 gap-2 bg-amber-50 border-b border-amber-100/80 px-4 py-3 text-xs font-black uppercase tracking-wider text-palma-navy">
              <div className="col-span-5 sm:col-span-6">
                {lang === 'ar' ? 'المنتج' : lang === 'he' ? 'מוצר' : 'Product'}
              </div>
              <div className="col-span-2 text-center hidden sm:block">
                {lang === 'ar' ? 'السعر' : 'Price'}
              </div>
              <div className="col-span-4 sm:col-span-3 text-center">
                {lang === 'ar' ? 'الكمية' : 'Quantity'}
              </div>
              <div className="col-span-3 sm:col-span-2 text-center">
                {lang === 'ar' ? 'المجموع' : 'Subtotal'}
              </div>
            </div>

            {cart.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center px-4 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
              >
                <div className="col-span-5 sm:col-span-6 flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onRemove(item.id, item.name || item.title)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                    aria-label={lang === 'ar' ? 'حذف' : 'Remove'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={item.images?.[0] || item.imageUrl || item.image_url || 'https://placehold.co/200x200?text=No+Image'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-palma-navy text-sm truncate">{item.name || item.title}</p>
                    {item.category && (
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide truncate">{item.category}</p>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-center hidden sm:block">
                  <span className="text-sm font-bold text-palma-navy">₪{unitPrice(item).toFixed(2)}</span>
                </div>
                <div className="col-span-4 sm:col-span-3 flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-palma-primaryLight hover:text-palma-primary transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold text-palma-navy min-w-[2rem] text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-palma-primaryLight hover:text-palma-primary transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="col-span-3 sm:col-span-2 text-center">
                  <span className="text-sm font-black text-palma-primary">₪{subtotal(item).toFixed(2)}</span>
                </div>
              </div>
            ))}

            {/* Coupon + Clear cart */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-slate-50/80 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={lang === 'ar' ? 'كود القسيمة' : 'Coupon Code'}
                  className="px-4 py-2.5 rounded-xl border border-palma-border text-sm font-medium text-palma-navy placeholder:text-slate-400 focus:ring-2 focus:ring-palma-primary/20 focus:border-palma-primary"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-5 py-2.5 rounded-xl bg-palma-primary text-white text-sm font-bold hover:bg-palma-navy transition"
                >
                  {lang === 'ar' ? 'تطبيق القسيمة' : 'Apply Coupon'}
                </button>
                {appliedCoupon && (
                  <span className="text-sm font-bold text-emerald-600">
                    {appliedCoupon.code} -{appliedCoupon.percent}%
                  </span>
                )}
              </div>
              {onClearCart && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-sm font-bold text-slate-500 hover:text-red-600 transition"
                >
                  {lang === 'ar' ? 'إفراغ السلة' : 'Clear Shopping Cart'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary — بطاقة على اليمين */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl border border-palma-border shadow-card p-6 sticky top-24">
            <h3 className="font-heading text-lg font-black text-palma-navy mb-4 border-b border-slate-200 pb-3">
              {lang === 'ar' ? 'ملخص الطلب' : lang === 'he' ? 'סיכום הזמנה' : 'Order Summary'}
            </h3>
            <p className="text-xs font-semibold text-emerald-600 mb-2">
              {lang === 'ar' ? 'خصم العروض (مثل 10% على السلة) مُطبّق تلقائياً على الأسعار أدناه.' : lang === 'he' ? 'הנחת מבצעים (למשל 10%) מחושבת במחירי הפריטים.' : 'Offer discounts (e.g. 10% on cart) are already applied to the prices below.'}
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-slate-500">{lang === 'ar' ? 'عدد القطع' : 'Items'}</span>
                <span className="font-bold text-palma-navy">{itemCount}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">{lang === 'ar' ? 'المجموع الفرعي' : 'Sub Total'}</span>
                <span className="font-bold text-palma-navy">₪{totalAmount.toFixed(2)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">{lang === 'ar' ? 'الشحن' : 'Shipping'}</span>
                <span className="font-bold text-palma-navy">₪{shipping.toFixed(2)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">{lang === 'ar' ? 'الضرائب' : 'Taxes'}</span>
                <span className="font-bold text-palma-navy">₪{taxes.toFixed(2)}</span>
              </li>
              {couponDiscount > 0 && (
                <li className="flex justify-between text-green-600">
                  <span>{lang === 'ar' ? 'خصم القسيمة' : 'Coupon Discount'}</span>
                  <span className="font-bold">-₪{couponDiscount.toFixed(2)}</span>
                </li>
              )}
            </ul>
            <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-palma-navy">
              <span className="font-heading font-black text-palma-navy">
                {lang === 'ar' ? 'الإجمالي' : 'Total'}
              </span>
              <span className="text-xl font-black text-palma-primary">₪{displayTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => onProceedToCheckout?.(selectedCartItems.length > 0 ? selectedCartItems : cart)}
              disabled={cart.length === 0}
              className="w-full mt-6 py-4 rounded-xl bg-palma-primary text-white font-black text-sm uppercase tracking-wider hover:bg-palma-navy transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lang === 'ar' ? 'متابعة للدفع' : 'Proceed to Checkout'}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature callouts — مثل التصميم: شحن مجاني، دفع مرن، دعم */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50/80 border border-amber-100">
          <div className="w-12 h-12 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-amber-800" />
          </div>
          <div>
            <p className="font-heading font-bold text-palma-navy">
              {lang === 'ar' ? 'شحن مجاني' : lang === 'he' ? 'משלוח חינם' : 'Free Shipping'}
            </p>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'يتوفر شحن لكل المناطق في فلسطين' : 'Shipping available to all areas in Palestine'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50/80 border border-amber-100">
          <div className="w-12 h-12 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6 text-amber-800" />
          </div>
          <div>
            <p className="font-heading font-bold text-palma-navy">
              {lang === 'ar' ? 'دفع مرن' : lang === 'he' ? 'תשלום גמיש' : 'Flexible Payment'}
            </p>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'خيارات دفع آمنة متعددة' : 'Multiple secure payment options'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-palma-primaryLight/50 border border-palma-primary/20">
          <div className="w-12 h-12 rounded-xl bg-palma-primary/20 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-palma-navy" />
          </div>
          <div>
            <p className="font-heading font-bold text-palma-navy">
              {lang === 'ar' ? 'دعم 24/7' : lang === 'he' ? 'תמיכה 24/7' : '24x7 Support'}
            </p>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'ندعمك أونلاين كل الأيام' : 'We support online all days'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
