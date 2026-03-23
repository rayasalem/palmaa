/**
 * Customer shop tab — تصميم على طراز SíMi Shop:
 * شريط بحث، تصنيفات أفقية، منتجات شائعة، تخفيضات، آخر طلب، وأفضل المنتجات.
 */

import React, { useRef } from 'react';
import { Product } from '../../types';
import type { Language } from '../../translations';
import {
  Search,
  Filter,
  Plus,
  ShoppingBag,
} from 'lucide-react';
import { ShopProductCard } from '../../components/CustomerShared';
import { prefetchComponent, prefetchProductData } from '../../prefetch';
import { CATEGORY_EMOJI } from '../../types';
import type { CartItem } from '../../types';
import { getOffers, type ShopOffer } from '../../services/offersApi';
import { secureImageSrc, setImageToPlaceholder } from '../../utils/secureUrl';
import { MediatorMarketingSection } from '../../components/MediatorMarketingSection';
import type { MediatorMarketingItem } from '../../types/mediatorMarketing';
import mediatorMarketingMock from '../../data/mediatorMarketingMock.json';

const SHOP_IMG_FALLBACK = 'https://placehold.co/400x400?text=No+Image';
const SHOP_IMG_FALLBACK_SM = 'https://placehold.co/200x200?text=No+Image';
const SHOP_IMG_ORDER = 'https://placehold.co/80x80?text=No+Image';
const SHOP_IMG_OFFER = 'https://placehold.co/400x400?text=Offer';

const MOST_POPULAR_CATEGORY_IDS = ['fruits', 'vegetables', 'dairy', 'phones', 'men_clothing', 'snacks'];
/** عدد المنتجات المعروضة في قسم «كل المنتجات» قبل زر المزيد */
const ALL_PRODUCTS_PREVIEW_SIZE = 8;

export interface CustomerShopTabProps {
  lang: Language;
  t: Record<string, any> & { common: Record<string, string>; categories: Record<string, string> };
  filteredShopProducts: Product[];
  shopSearch: string;
  setShopSearch: (v: string) => void;
  shopCategoryId: string;
  shopConditionFilter: string;
  setShopConditionFilter: (v: string) => void;
  categorySearch: string;
  setCategorySearch: (v: string) => void;
  expandedGroupId: string | null;
  setExpandedGroupId: (v: string | null) => void;
  showAllGroups: boolean;
  setShowAllGroups: (v: boolean) => void;
  onCategorySelect: (category: string) => void;
  onAddToCart: (product: Product) => void;
  addingToCartProductId?: string | null;
  onViewProduct?: (id: string) => void;
  onViewProfile?: (profileId: string) => void;
  /** عناصر آخر طلب (اختياري) لعرض قسم "آخر طلب" */
  lastOrderItems?: CartItem[];
  onUpdateLastOrderQuantity?: (productId: string, delta: number) => void;
  /** الانتقال لصفحة كل المنتجات مع الفلترة (الكتالوج) */
  onNavigateToCatalog?: () => void;
}

export const CustomerShopTab: React.FC<CustomerShopTabProps> = ({
  lang,
  t,
  filteredShopProducts,
  shopSearch,
  setShopSearch,
  shopCategoryId,
  shopConditionFilter,
  setShopConditionFilter,
  categorySearch,
  setCategorySearch,
  expandedGroupId,
  setExpandedGroupId,
  showAllGroups,
  setShowAllGroups,
  onCategorySelect,
  onAddToCart,
  addingToCartProductId,
  onViewProduct,
  onViewProfile,
  lastOrderItems = [],
  onUpdateLastOrderQuantity,
  onNavigateToCatalog,
}) => {
  const common = t.common as Record<string, string>;
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [offers, setOffers] = React.useState<ShopOffer[]>([]);
  React.useEffect(() => {
    getOffers().then((res) => {
      if (res.success && res.offers) setOffers(res.offers);
    });
  }, []);

  const popularProducts = React.useMemo(
    () =>
      filteredShopProducts
        .slice()
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 12),
    [filteredShopProducts]
  );

  const topItems = React.useMemo(
    () =>
      filteredShopProducts
        .filter((p) => p.is_bestseller)
        .slice()
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 8),
    [filteredShopProducts]
  );

  /** منتجات عليها خصم — تظهر في قسم العروض مع عروض الإدمن */
  const discountProducts = React.useMemo(
    () =>
      filteredShopProducts.filter((p) => {
        const base = p.price ?? p.price_ils ?? 0;
        const final = (p as any).final_price != null ? (p as any).final_price : base;
        return final < base && base > 0;
      }).slice(0, 8),
    [filteredShopProducts]
  );

  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);

  return (
    <div
      className="rounded-3xl"
      style={{
        background:
          'radial-gradient(1200px 500px at 50% -100px, rgba(16,185,129,0.12), transparent 60%), linear-gradient(180deg, rgba(236, 253, 245, 0.35) 0%, rgba(255,255,255,0.92) 30%)',
      }}
    >
      <div className="mx-auto w-full max-w-[1380px] p-3 sm:p-5 lg:p-6 space-y-5 sm:space-y-6">
        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-2xl font-black">
                {lang === 'ar' ? 'تسوق مرتب، سريع، وفخم' : 'Clean, fast and premium shopping'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-50/95">
                {lang === 'ar'
                  ? 'اختَر المنتجات بسهولة، فلترة ذكية، وتجربة واضحة من أول لحظة.'
                  : 'Browse faster with clear sections, smart filters, and premium layout.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="relative">
                <Search
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700 left-3 rtl:left-auto rtl:right-3"
                  aria-hidden
                />
                <input
                  type="text"
                  placeholder={
                    lang === 'ar'
                      ? 'ابحث عن منتجاتك...'
                      : lang === 'he'
                        ? 'חפש מוצרים...'
                        : 'Search products...'
                  }
                  className="w-full pl-10 rtl:pl-4 pr-4 rtl:pr-10 py-3 rounded-2xl border border-white/40 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-200 focus:ring-2 focus:ring-white/60 outline-none shadow-sm"
                  value={shopSearch || categorySearch}
                  onChange={(e) => {
                    setShopSearch(e.target.value);
                    setCategorySearch(e.target.value);
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold">
                <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/30">
                  {lang === 'ar' ? 'توصيل سريع' : 'Fast Delivery'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/30">
                  {lang === 'ar' ? 'منتجات محلية' : 'Local Products'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <MediatorMarketingSection
          lang={lang}
          items={mediatorMarketingMock as MediatorMarketingItem[]}
          onProductClick={(id) => onViewProduct?.(id)}
          onViewMore={() => {
            if (typeof window !== 'undefined') window.location.hash = '#/mediator';
          }}
        />

        <section className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm sm:text-base font-black text-slate-800">
              {lang === 'ar' ? 'التصنيفات والفلترة' : lang === 'he' ? 'קטגוריות וסינון' : 'Categories & Filters'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
              >
                <Filter className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'فلتر' : 'Filter'}
              </button>
              <button
                type="button"
                onClick={() => (onNavigateToCatalog ? onNavigateToCatalog() : onCategorySelect('all'))}
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:underline"
              >
                {lang === 'ar' ? 'عرض الكل' : 'View all'}
              </button>
            </div>
          </div>
          {filterOpen && (
            <div className="mb-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <select
                className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                value={shopConditionFilter}
                onChange={(e) => setShopConditionFilter(e.target.value)}
              >
                <option value="all">{lang === 'ar' ? 'كل الحالات' : 'All conditions'}</option>
                <option value="new">{lang === 'ar' ? 'جديد' : 'New'}</option>
                <option value="used_like_new">{lang === 'ar' ? 'مستعمل – كالجديد' : 'Used – Like New'}</option>
                <option value="used_good">{lang === 'ar' ? 'مستعمل – جيد' : 'Used – Good'}</option>
                <option value="refurbished">{lang === 'ar' ? 'مجدّد' : 'Refurbished'}</option>
              </select>
            </div>
          )}
          <div
            ref={categoriesScrollRef}
            className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {MOST_POPULAR_CATEGORY_IDS.map((catId) => {
              const label = (t.categories[catId] || catId) as string;
              const emoji = CATEGORY_EMOJI[catId] || '📦';
              const isActive = shopCategoryId === catId;
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => onCategorySelect(shopCategoryId === catId ? 'all' : catId)}
                  className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border min-w-[92px] shrink-0 transition ${
                    isActive
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs font-bold text-center line-clamp-2">{label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onCategorySelect('all')}
              className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border min-w-[92px] shrink-0 transition ${
                shopCategoryId === 'all'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
              }`}
            >
              <span className="text-xl">📦</span>
              <span className="text-xs font-bold text-center">{t.common.allCategories}</span>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              {lang === 'ar' ? 'المنتجات الشائعة' : lang === 'he' ? 'מוצרים פופולריים' : 'Popular Products'}
            </h3>
            <button
              type="button"
              onClick={() => (onNavigateToCatalog ? onNavigateToCatalog() : onCategorySelect('all'))}
              className="text-xs sm:text-sm font-bold text-emerald-700 hover:underline"
            >
              {lang === 'ar' ? 'عرض المزيد' : 'View More'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {popularProducts.slice(0, 8).map((p) => (
              <div
                key={p.id}
                onMouseEnter={() => {
                  prefetchComponent('PublicProductDetails');
                  prefetchProductData(p.id);
                }}
              >
                <ShopProductCard
                  product={p}
                  lang={lang}
                  t={t}
                  onViewProduct={onViewProduct}
                  onViewProfile={onViewProfile}
                  onAddToCart={onAddToCart}
                  isAddingToCart={addingToCartProductId === p.id}
                  onQuickView={setQuickViewProduct}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="xl:col-span-2 rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                {lang === 'ar' ? 'تخفيضات وعروض' : lang === 'he' ? 'מבצעים והנחות' : 'Offers & Discounts'}
              </h3>
              <button
                type="button"
                onClick={() => (onNavigateToCatalog ? onNavigateToCatalog() : onCategorySelect('all'))}
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:underline"
              >
                {lang === 'ar' ? 'عرض المزيد' : 'View More'}
              </button>
            </div>
            {offers.length === 0 && discountProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-slate-500 font-medium">
                  {lang === 'ar' ? 'لا عروض حالياً' : lang === 'he' ? 'אין מבצעים כרגע' : 'No offers at the moment'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {offers.slice(0, 4).map((o) => {
                  const goToCatalog = () => {
                    onNavigateToCatalog?.();
                    if (typeof window !== 'undefined' && window.location.hash !== '#/catalog') {
                      window.location.hash = '#/catalog';
                    }
                  };
                  const handleOfferClick = () => {
                    if (o.type === 'product' && o.product_id) onViewProduct?.(o.product_id);
                    else goToCatalog();
                  };
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className="text-left rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                      onClick={handleOfferClick}
                    >
                      <div className="aspect-square bg-slate-100">
                        <img
                          src={o.image_url || SHOP_IMG_OFFER}
                          alt={o.title || 'Offer'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs text-slate-600 line-clamp-2">{o.subtitle || o.title}</p>
                        <p className="text-lg font-black text-emerald-600">%{o.discount_label || 0}</p>
                      </div>
                    </button>
                  );
                })}
                {discountProducts.slice(0, 4).map((p) => {
                  const basePrice = p.price ?? p.price_ils ?? 0;
                  const finalPrice = (p as any).final_price != null ? (p as any).final_price : basePrice;
                  const pct = Math.round((1 - finalPrice / basePrice) * 100);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="text-left rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                      onClick={() => onViewProduct?.(p.id)}
                    >
                      <div className="aspect-square bg-slate-100 relative">
                        <img
                          src={secureImageSrc(p.images?.[0] || p.imageUrl || p.image_url, SHOP_IMG_FALLBACK_SM)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={setImageToPlaceholder}
                        />
                        <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-black">
                          %{pct}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">{p.name}</p>
                        <p className="text-sm font-black text-emerald-600">
                          ₪{finalPrice.toFixed(2)}
                          <span className="text-xs text-slate-400 line-through mr-1">₪{basePrice.toFixed(2)}</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="text-base sm:text-lg font-black text-slate-800 mb-3">
              {lang === 'ar' ? 'آخر طلب' : lang === 'he' ? 'ההזמנה האחרונה' : 'Last Order'}
            </h3>
            {lastOrderItems.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">
                {lang === 'ar' ? 'لا توجد طلبات سابقة' : 'No recent orders'}
              </p>
            ) : (
              <ul className="space-y-2">
                {lastOrderItems.slice(0, 5).map((item) => {
                  const img = secureImageSrc(item.images?.[0] || item.imageUrl || item.image_url, SHOP_IMG_ORDER);
                  return (
                    <li key={item.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <img src={img} alt={item.name} className="w-full h-full object-cover" onError={setImageToPlaceholder} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {lang === 'ar' ? `الكمية ${item.quantity}` : `Qty ${item.quantity}`}
                        </p>
                      </div>
                      {onUpdateLastOrderQuantity && (
                        <div className="flex items-center bg-slate-100 rounded-lg">
                          <button type="button" onClick={() => onUpdateLastOrderQuantity(item.id, -1)} className="px-2 py-1 text-slate-600">
                            −
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                          <button type="button" onClick={() => onUpdateLastOrderQuantity(item.id, 1)} className="px-2 py-1 text-slate-600">
                            +
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onAddToCart(item)}
                        disabled={addingToCartProductId === item.id}
                        className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 disabled:opacity-70"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              {lang === 'ar' ? 'الأكثر مبيعًا' : lang === 'he' ? 'הנמכרים ביותר' : 'Best Sellers'}
            </h3>
            <button
              type="button"
              onClick={() => (onNavigateToCatalog ? onNavigateToCatalog() : onCategorySelect('all'))}
              className="text-xs sm:text-sm font-bold text-emerald-700 hover:underline"
            >
              {lang === 'ar' ? 'عرض المزيد' : 'View More'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {(topItems.length ? topItems : filteredShopProducts).slice(0, 8).map((p) => (
              <div
                key={p.id}
                onMouseEnter={() => {
                  prefetchComponent('PublicProductDetails');
                  prefetchProductData(p.id);
                }}
              >
                <ShopProductCard
                  product={p}
                  lang={lang}
                  t={t}
                  onViewProduct={onViewProduct}
                  onViewProfile={onViewProfile}
                  onAddToCart={onAddToCart}
                  isAddingToCart={addingToCartProductId === p.id}
                  onQuickView={setQuickViewProduct}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              {lang === 'ar' ? 'كل المنتجات' : lang === 'he' ? 'כל המוצרים' : 'All Products'}
            </h3>
            {onNavigateToCatalog && filteredShopProducts.length > 0 && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-palma-primary text-white font-bold text-xs sm:text-sm shadow-md hover:bg-palma-primaryHover transition"
              >
                <ShoppingBag className="w-4 h-4" />
                {lang === 'ar' ? 'عرض المزيد — كل المنتجات' : 'Show more — all products'}
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            {filteredShopProducts.length === 0
              ? (lang === 'ar' ? 'لا توجد منتجات تطابق البحث أو التصنيف.' : lang === 'he' ? 'אין מוצרים תואמים.' : 'No products match your filters.')
              : lang === 'ar'
                ? `عرض جزء من المنتجات (${Math.min(ALL_PRODUCTS_PREVIEW_SIZE, filteredShopProducts.length)} ${filteredShopProducts.length > ALL_PRODUCTS_PREVIEW_SIZE ? `من ${filteredShopProducts.length}` : ''})`
                : lang === 'he'
                  ? `מציג חלק מהמוצרים (${Math.min(ALL_PRODUCTS_PREVIEW_SIZE, filteredShopProducts.length)}${filteredShopProducts.length > ALL_PRODUCTS_PREVIEW_SIZE ? ` מתוך ${filteredShopProducts.length}` : ''})`
                  : `Showing part of products (${Math.min(ALL_PRODUCTS_PREVIEW_SIZE, filteredShopProducts.length)}${filteredShopProducts.length > ALL_PRODUCTS_PREVIEW_SIZE ? ` of ${filteredShopProducts.length}` : ''})`}
          </p>
          {filteredShopProducts.length === 0 ? (
            <div className="py-12 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-medium">
                {lang === 'ar' ? 'لا توجد منتجات تطابق البحث أو التصنيف.' : 'No products match your filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredShopProducts.slice(0, ALL_PRODUCTS_PREVIEW_SIZE).map((p) => (
                <div
                  key={p.id}
                  onMouseEnter={() => {
                    prefetchComponent('PublicProductDetails');
                    prefetchProductData(p.id);
                  }}
                >
                  <ShopProductCard
                    product={p}
                    lang={lang}
                    t={t}
                    onViewProduct={onViewProduct}
                    onViewProfile={onViewProfile}
                    onAddToCart={onAddToCart}
                    isAddingToCart={addingToCartProductId === p.id}
                    onQuickView={setQuickViewProduct}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-palma-navy">
                {lang === 'ar' ? 'عرض سريع' : 'Quick View'}
              </h3>
              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50">
                <img
                  src={secureImageSrc(
                    quickViewProduct.images?.[0] || quickViewProduct.imageUrl || quickViewProduct.image_url,
                    SHOP_IMG_FALLBACK
                  )}
                  alt={quickViewProduct.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={setImageToPlaceholder}
                />
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-palma-navy text-base line-clamp-2">{quickViewProduct.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-3">
                  {quickViewProduct.description || quickViewProduct.shortDescription}
                </p>
                <p className="text-sm font-black text-palma-primary">
                  ₪{quickViewProduct.price ?? quickViewProduct.price_ils ?? 0}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(quickViewProduct);
                    setQuickViewProduct(null);
                  }}
                  className="w-full mt-2 btn-primary py-3 text-[11px] uppercase tracking-widest"
                >
                  {lang === 'ar' ? 'إضافة للسلة' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
