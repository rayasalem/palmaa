import React, { useEffect, useState, useRef, useMemo } from 'react';
import { productService } from '../services/productService';
import { Product } from '../types';
import { marketStore } from '../store';
import { prefetchComponent, prefetchProductData } from '../prefetch';
import Logo from './Logo';
import { ProductConditionBadge } from './ProductConditionBadge';
import { Language, translations } from '../translations';
import ComingSoonHero from './ComingSoonHero';
import {
  ShoppingBag,
  TrendingUp,
  Store,
  Globe,
  ChevronDown,
  Menu,
  X,
  Users,
  Shield,
  ShieldCheck,
  Lock,
  BarChart3,
  Server,
  Sparkles,
  Rocket,
  Layers,
  Package,
  UserPlus,
  Settings,
  LineChart,
  Facebook,
  Instagram,
  MessageCircle,
  MailCheck,
  ArrowLeft,
} from 'lucide-react';

const LANG_LABELS: Record<Language, string> = { ar: 'العربية', en: 'English', he: 'עברית' };

/** إيميل وهاتف التواصل في الفوتر — غيّرهما لإيميلك ورقمك الحقيقيين */
const FOOTER_CONTACT_EMAIL = 'office@palma.ps';
const FOOTER_CONTACT_PHONE = '+970569676111';
const FOOTER_CONTACT_PHONE_DISPLAY = '+970569676111';

interface PublicWebsiteProps {
  lang: Language;
  setLang: (l: Language) => void;
  onLoginClick: () => void;
  /** فتح صفحة انشاء حساب جديد (اختيار الدور: تاجر / زبون / مسوق) */
  onJoinRegister: () => void;
  onJoinMerchant: () => void;
  onJoinBroker: () => void;
  onJoinCustomer: () => void;
  onExploreProducts: () => void;
  onViewProduct?: (id: string) => void;
  onOpenTerms?: () => void;
}

const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  lang,
  setLang,
  onLoginClick,
  onJoinRegister,
  onJoinMerchant,
  onJoinBroker,
  onJoinCustomer,
  onExploreProducts,
  onViewProduct,
  onOpenTerms,
}) => {
  const t = translations[lang];
  const [products, setProducts] = useState<Product[]>([]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const featuredScrollRef = useRef<HTMLDivElement>(null);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = autoScrollPaused;

  useEffect(() => {
    const fetchFeatured = async () => {
      const all = await productService.getAll();
      setProducts((all || []).slice(0, 24));
    };
    fetchFeatured();
  }, []);

  /** منتجات جديدة — آخر المنتجات المضافة للموقع (مرتبة حسب تاريخ الإضافة) */
  const newProducts = useMemo(
    () =>
      [...(products || [])]
        .filter((p) => p.isActive !== false)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, 12),
    [products]
  );

  // إعادة جلب المنتجات عند العودة للصفحة (مثلاً بعد حذف من لوحة الإدارة) لضمان عرض محدث
  useEffect(() => {
    const onFocus = () => {
      productService.getAll().then((all) => setProducts((all || []).slice(0, 24)));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // كاروسيل المنتجات — تمرير تلقائي مستمر (مثل صنع بحب)، يتحرك عندما القسم ظاهر
  useEffect(() => {
    const el = featuredScrollRef.current;
    if (!el || products.length < 2) return;

    let rafId: number | null = null;
    let lastTime = 0;
    const stepPx = 1.2;
    const targetFps = 60;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          if (rafId != null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          return;
        }
        if (rafId != null) return;

        const tick = (now: number) => {
          rafId = requestAnimationFrame(tick);
          const container = featuredScrollRef.current;
          if (!container || pausedRef.current) return;
          const maxScroll = container.scrollWidth - container.clientWidth;
          if (maxScroll <= 0) return;
          const delta = (now - lastTime) / (1000 / targetFps);
          lastTime = now;
          container.scrollLeft += stepPx * Math.min(delta, 3);
          // إعادة للبداية عند نهاية المجموعة الأولى (قائمة مكررة = تمرير لا نهائي)
          const loopAt = container.scrollWidth / 2;
          if (container.scrollLeft >= loopAt - 2) container.scrollLeft = 0;
        };

        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      },
      { root: null, rootMargin: '0px', threshold: 0.15 }
    );

    const startAfterLayout = () => {
      requestAnimationFrame(() => {
        observer.observe(el);
      });
    };
    startAfterLayout();

    return () => {
      observer.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [products.length]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navSections = [
    { id: 'hero', ar: 'الرئيسية', en: 'Home', he: 'בית', scroll: true },
    { id: 'features', ar: 'المزايا', en: 'Features', he: 'תכונות', scroll: true },
    { id: 'products', ar: 'التسوق', en: 'Shop', he: 'חנות', scroll: false }, // يفتح صفحة الكتالوج لرؤية كل المنتجات
    { id: 'faq', ar: 'الأسئلة الشائعة', en: 'FAQ', he: 'שאלות נפוצות', scroll: true },
    { id: 'contact', ar: 'تواصل', en: 'Contact', he: 'צור קשר', scroll: true },
  ];

  return (
    <div
      className="bg-palma-soft font-sans text-palma-text overflow-x-hidden min-h-screen flex flex-col touch-target-min max-w-[100vw]"
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      {/* Navbar - Fixed; on mobile: hamburger + logo, menu opens with logo inside */}
      <nav
        className="fixed top-0 left-0 right-0 w-full bg-white/95 backdrop-blur-xl z-[100] border-b border-palma-border shadow-soft h-14 sm:h-16 transition-all duration-300 font-heading touch-target-min"
        style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          {/* اللوجو + روابط السكشنات — محاذاة واحدة */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-5 min-w-0">
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="sm:hidden p-2 rounded-lg text-palma-navy hover:bg-slate-100 transition-colors shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div
              className="cursor-pointer hover:opacity-90 transition-opacity shrink-0"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Logo size="medium" />
            </div>
            <div className="hidden lg:block w-px h-4 bg-palma-border shrink-0 self-center" aria-hidden />
            <nav className="hidden lg:flex items-center gap-0.5 flex-wrap">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => (s.scroll !== false ? scrollToSection(s.id) : onExploreProducts())}
                  className="px-2.5 py-2 text-[11px] font-bold text-palma-navy hover:text-palma-primary transition-colors rounded-lg hover:bg-palma-primaryLight/50"
                >
                  {lang === 'ar' ? s.ar : lang === 'he' ? s.he : s.en}
                </button>
              ))}
            </nav>
          </div>
          {/* لغة + تسجيل دخول + انضم لبالما */}
          <div className="hidden sm:flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="relative flex items-center">
              <button
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-palma-muted hover:text-palma-primary transition tracking-wider py-2"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>{LANG_LABELS[lang]}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setLangMenuOpen(false)} />
                  <div className="absolute top-full mt-1 end-0 min-w-[120px] py-1 rounded-lg border border-palma-border bg-white shadow-lg z-[100]">
                    {(['ar', 'en', 'he'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setLang(l);
                          setLangMenuOpen(false);
                        }}
                        className={`block w-full text-left rtl:text-right px-3 py-2 text-xs font-medium ${l === lang ? 'bg-palma-primaryLight text-palma-primary' : 'text-palma-navy hover:bg-slate-50'}`}
                      >
                        {LANG_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="w-px h-4 bg-palma-border self-stretch" aria-hidden />
            <button
              onClick={onLoginClick}
              className="text-sm font-semibold text-palma-navy hover:text-palma-primary transition py-2"
            >
              {t.nav.login}
            </button>
            <button
              onClick={onJoinRegister}
              className="btn-primary px-4 py-2 text-[10px] sm:text-xs tracking-wide h-9 flex items-center justify-center"
            >
              {lang === 'ar' ? 'انضم لبالما' : lang === 'he' ? 'הצטרף לפלמה' : 'Join Palma'}
            </button>
          </div>
        </div>

        {/* Mobile menu overlay – logo inside + links */}
        {mobileMenuOpen && (
          <>
            <div
              className="sm:hidden fixed inset-0 top-14 sm:top-16 bg-slate-900/40 backdrop-blur-sm z-[99]"
              aria-hidden
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="sm:hidden fixed top-14 sm:top-16 left-0 right-0 bg-white border-b border-palma-border shadow-xl z-[100] py-6 px-4 animate-in fade-in slide-in-from-top-4 duration-200 max-h-[85vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-6">
                <div className="mb-2">
                  <Logo size="medium" />
                </div>
                <nav className="w-full flex flex-col gap-1">
                  {navSections.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        s.scroll !== false ? scrollToSection(s.id) : onExploreProducts();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-3.5 text-sm font-semibold text-palma-navy hover:bg-palma-primaryLight rounded-xl transition-colors text-center"
                    >
                      {lang === 'ar' ? s.ar : lang === 'he' ? s.he : s.en}
                    </button>
                  ))}
                </nav>
                <div className="w-full h-px bg-palma-border" />
                <div className="relative w-full flex justify-center">
                  <button
                    onClick={() => setLangMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 text-[10px] font-semibold uppercase text-palma-muted hover:text-palma-primary tracking-widest"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{LANG_LABELS[lang]}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {langMenuOpen && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[140px] py-1 rounded-lg border border-palma-border bg-white shadow-lg z-10">
                      {(['ar', 'en', 'he'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => {
                            setLang(l);
                            setLangMenuOpen(false);
                          }}
                          className={`block w-full text-center px-3 py-2 text-xs font-medium ${l === lang ? 'bg-palma-primaryLight text-palma-primary' : 'text-palma-navy hover:bg-slate-50'}`}
                        >
                          {LANG_LABELS[l]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    onLoginClick();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3.5 text-sm font-semibold text-palma-navy hover:bg-palma-primaryLight rounded-xl transition-colors"
                >
                  {t.nav.login}
                </button>
                <button
                  onClick={() => {
                    onJoinRegister();
                    setMobileMenuOpen(false);
                  }}
                  className="btn-primary w-full py-3.5 text-[10px] tracking-wide"
                >
                  {lang === 'ar' ? 'انضم لبالما' : lang === 'he' ? 'הצטרף לפלמה' : 'Join Palma'}
                </button>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Main Content - padding-top يطابق ارتفاع الناف بار */}
      <main className="flex-1 w-full pt-14 sm:pt-16">
        {/* 1. Hero Section */}
        <section id="hero" aria-label={lang === 'ar' ? 'الرئيسية' : 'Hero'}>
          <ComingSoonHero lang={lang} onStartNow={onJoinRegister} onExploreProducts={onExploreProducts} />
        </section>

        {/* 2. المنتجات المميزة — كاروسيل تمرير أفقي (الترتيب الثالث: ناف بار → هيرو → هذا القسم → ثم المنتجات) */}
        <section id="featured-products" className="section-bg-6 py-24 sm:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="heading-block mb-6">
              <h2 className="heading-block-title heading-block-title-creative font-heading text-4xl lg:text-5xl">
                {t.common.featured}
              </h2>
              <div className="w-16 h-1.5 bg-palma-primary mx-auto rounded-full my-2" aria-hidden />
              <p className="heading-block-sub">{t.common.featuredSub}</p>
            </div>
            <p className="text-center text-xs font-semibold text-palma-muted mb-6">
              {lang === 'ar'
                ? 'التمرير تلقائي — أو اسحبي للتصفح'
                : lang === 'he'
                  ? 'גלילה אוטומטית — או גרור'
                  : 'Auto-scrolling — or drag to browse'}
            </p>
            <div className="relative w-full overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-4 w-24 sm:w-32 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, #f1f5f9 0%, transparent 100%)' }}
                aria-hidden
              />
              <div
                className="absolute right-0 top-0 bottom-4 w-24 sm:w-32 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to left, #f1f5f9 0%, transparent 100%)' }}
                aria-hidden
              />
              <div
                ref={featuredScrollRef}
                onMouseEnter={() => setAutoScrollPaused(true)}
                onMouseLeave={() => setAutoScrollPaused(false)}
                className="flex gap-6 overflow-x-auto overflow-y-hidden pb-4 pt-2 scrollbar-hide w-full"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  direction: 'ltr',
                  scrollBehavior: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
                role="region"
                aria-label={lang === 'ar' ? 'المنتجات المميزة' : 'Featured products'}
              >
                {[...products, ...products].map((p, index) => {
                  const mainImage =
                    p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
                  const mName =
                    p.merchantName || marketStore.getMerchantNameByUserId(p.merchant_id || p.merchantId || '');
                  const shortDesc = p.shortDescription || (p.description || '').slice(0, 50) || mName;
                  const stock = p.stock ?? 0;
                  return (
                    <div
                      key={`${p.id}-${index}`}
                      onClick={() => onViewProduct && onViewProduct(p.id)}
                      onMouseEnter={() => {
                        prefetchComponent('PublicProductDetails');
                        prefetchProductData(p.id);
                      }}
                      className="flex-shrink-0 w-[280px] sm:w-[300px] snap-center bg-white rounded-2xl border border-palma-border shadow-card hover:shadow-card-hover transition-all duration-300 group cursor-pointer overflow-hidden"
                    >
                      <div className="aspect-square overflow-hidden bg-slate-50 relative">
                        <img
                          src={mainImage}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          alt={p.name}
                        />
                        <div className="absolute top-3 left-3 bg-palma-primary text-white px-3 py-1.5 rounded-lg text-sm font-black shadow-lg">
                          ₪{p.price ?? p.price_ils ?? 0}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-black text-palma-navy text-base mb-1 group-hover:text-palma-primary transition-colors line-clamp-2">
                          {p.name}
                        </h4>
                        <p className="text-xs text-slate-500 mb-2 line-clamp-1">{shortDesc}</p>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {stock > 0 && (
                            <span className="text-[10px] font-bold text-slate-600">
                              {lang === 'ar'
                                ? `متوفر: ${stock}`
                                : lang === 'he'
                                  ? `במלאי: ${stock}`
                                  : `Available: ${stock}`}
                            </span>
                          )}
                          <ProductConditionBadge condition={p.condition} lang={lang} className="shrink-0" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">{mName}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProduct && onViewProduct(p.id);
                          }}
                          className="mt-3 w-full py-2.5 bg-palma-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-palma-primaryHover transition-colors"
                        >
                          {t.common.details}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {products.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-medium">
                {lang === 'ar' ? 'لا توجد منتجات مميزة حالياً' : 'No featured products yet'}
              </div>
            )}
          </div>
        </section>

        {/* الإحصائيات – أرقام تفاعلية تجذب الانتباه */}
        <section className="bg-white pt-4 pb-14 sm:pt-6 sm:pb-20 border-y border-palma-border relative z-10 -mt-2">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <div className="text-center group cursor-default card-hover-lift rounded-2xl p-4 hover:bg-palma-soft/50 transition-colors duration-300">
                <div className="font-heading text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">
                  +500
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                  {lang === 'ar' ? 'تاجر جديد شهريا' : 'New merchants per month'}
                </div>
              </div>
              <div className="text-center group cursor-default card-hover-lift rounded-2xl p-4 hover:bg-palma-soft/50 transition-colors duration-300">
                <div className="font-heading text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">
                  10K
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                  {lang === 'ar' ? '10 الاف منتج' : '10,000 products'}
                </div>
              </div>
              <div className="text-center group cursor-default card-hover-lift rounded-2xl p-4 hover:bg-palma-soft/50 transition-colors duration-300">
                <div className="font-heading text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">
                  50K
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                  {lang === 'ar' ? '50 الف زبون شهريا' : '50K customers per month'}
                </div>
              </div>
              <div className="text-center group cursor-default card-hover-lift rounded-2xl p-4 hover:bg-palma-soft/50 transition-colors duration-300">
                <div className="font-heading text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">
                  1M
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                  {lang === 'ar' ? '1 مليون زائر موثّق سنوياً' : '1M verified visits per year'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* قسم منتجات جديدة — آخر المنتجات المضافة للموقع */}
        {newProducts.length > 0 && (
          <section
            id="new-products"
            className="bg-palma-soft py-14 sm:py-20 border-b border-palma-border"
            aria-label={lang === 'ar' ? 'منتجات جديدة' : lang === 'he' ? 'מוצרים חדשים' : 'New arrivals'}
          >
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="font-heading text-2xl sm:text-3xl font-black text-palma-navy">
                    {lang === 'ar' ? 'منتجات جديدة' : lang === 'he' ? 'מוצרים חדשים' : 'New arrivals'}
                  </h2>
                  <p className="text-sm text-palma-muted mt-1">
                    {lang === 'ar'
                      ? 'آخر المنتجات المضافة للموقع'
                      : lang === 'he'
                        ? 'המוצרים האחרונים שנוספו לאתר'
                        : 'Latest products added to the site'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExploreProducts}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-palma-primary text-palma-primary font-bold text-sm hover:bg-palma-primary hover:text-white transition-all duration-200"
                >
                  {lang === 'ar' ? 'عرض الكل' : lang === 'he' ? 'הצג הכל' : 'View all'}
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {newProducts.map((p) => {
                  const mainImage =
                    p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
                  const mName =
                    p.merchantName || marketStore.getMerchantNameByUserId(p.merchant_id || p.merchantId || '');
                  const basePrice = p.price ?? p.price_ils ?? 0;
                  const finalPrice = (p as any).final_price != null ? (p as any).final_price : basePrice;
                  const hasDiscount = finalPrice < basePrice;
                  const discountPercent =
                    (p as any).discount_percent != null
                      ? Number((p as any).discount_percent)
                      : basePrice > 0 && hasDiscount
                        ? Math.round((1 - finalPrice / basePrice) * 100)
                        : 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onViewProduct?.(p.id)}
                      onMouseEnter={() => {
                        prefetchComponent('PublicProductDetails');
                        prefetchProductData(p.id);
                      }}
                      className="bg-white rounded-2xl border border-palma-border shadow-card hover:shadow-card-hover transition-all duration-300 group cursor-pointer overflow-hidden"
                    >
                      <div className="aspect-square overflow-hidden bg-slate-50 relative">
                        <img
                          src={mainImage}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          alt={p.name || ''}
                        />
                        {hasDiscount && (
                          <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-1 rounded-sm text-xs font-black shadow-lg">
                            {discountPercent > 0 ? (
                              <span>%{discountPercent}-</span>
                            ) : (
                              <span>{lang === 'ar' ? 'تخفيضات!' : lang === 'he' ? 'הנחות!' : 'Sale!'}</span>
                            )}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg text-palma-navy border border-slate-200/80">
                          {hasDiscount ? (
                            <span className="flex items-baseline gap-1.5">
                              <span className="font-bold text-red-600">₪{finalPrice}</span>
                              <span className="line-through text-[10px] text-slate-400">₪{basePrice}</span>
                            </span>
                          ) : (
                            <>₪{basePrice}</>
                          )}
                        </div>
                        <span className="absolute bottom-2 right-2 bg-palma-primary text-white px-2 py-0.5 rounded-lg text-[10px] font-black">
                          {lang === 'ar' ? 'جديد' : lang === 'he' ? 'חדש' : 'New'}
                        </span>
                      </div>
                      <div className="p-3 sm:p-4">
                        <h3 className="font-bold text-palma-navy text-sm sm:text-base line-clamp-2 group-hover:text-palma-primary transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-xs text-palma-muted mt-0.5 truncate">{mName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 2. كل ما يحتاجه عملك — داخل مساحة/منصة واحدة */}
        <section id="features" className="section-bg-1 py-24 relative overflow-hidden border-b border-palma-border">
          <div className="absolute top-0 left-0 w-full h-full bg-palma-primaryLight/30 -skew-y-3 transform origin-top-left z-0 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="heading-block mb-14 text-center max-w-4xl mx-auto">
              <span className="inline-block text-palma-primary font-bold uppercase tracking-widest text-[10px] bg-palma-primaryLight/90 px-4 py-2 rounded-full border border-palma-primary/15 mb-4">
                {t.landing.aboutSubtitle}
              </span>
              <h2 className="heading-block-title heading-block-title-creative font-heading text-3xl sm:text-4xl md:text-5xl mb-4">
                {lang === 'ar'
                  ? 'كل ما يحتاجه عملك — داخل منصة واحدة'
                  : 'Everything your business needs — in one platform'}
              </h2>
              <p className="heading-block-sub max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
                {lang === 'ar'
                  ? 'تجمع بالما عملياتك اليومية في مكان واحد: من إدارة المنتجات والطلبات إلى الترويج والأرباح، كل شيء يعمل معاً.'
                  : 'Palma brings your daily operations together in one place: from products and orders to promotion and earnings.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 - Merchant */}
              <div
                className="card card-hover-lift p-8 rounded-2xl transition-all duration-300 group cursor-pointer border-2 border-transparent hover:border-palma-primary/20"
                onClick={onJoinMerchant}
              >
                <div className="w-16 h-16 bg-palma-primaryLight rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-palma-primary/10 transition-all duration-300 shadow-soft">
                  <Store className="w-8 h-8 text-palma-navy" />
                </div>
                <h3 className="font-heading text-xl font-black text-palma-navy mb-3">
                  {t.landing.features.merchantTitle}
                </h3>
                <p className="heading-block-sub text-slate-500 mb-4">{t.landing.features.merchantDesc}</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-palma-primary group-hover:underline">
                  {lang === 'ar' ? 'سجّل كتاجر ←' : 'Register as merchant ←'}
                </span>
              </div>

              {/* Feature 2 - Broker (Highlighted) */}
              <div
                className="bg-palma-navy p-8 rounded-2xl shadow-card-hover transition-all duration-300 group text-white relative overflow-hidden card-hover-lift cursor-pointer border-2 border-palma-primary/50 hover:border-palma-primary"
                onClick={onJoinBroker}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md relative z-10 group-hover:scale-110 transition-transform ring-1 ring-white/10">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-heading text-xl font-black mb-3 relative z-10">{t.landing.features.brokerTitle}</h3>
                <p className="text-sm text-slate-300 font-medium leading-relaxed relative z-10 mb-4">
                  {t.landing.features.brokerDesc}
                </p>
                <span className="relative z-10 text-[10px] font-black uppercase tracking-widest text-white/90 group-hover:underline">
                  {lang === 'ar' ? 'سجّل كمسوق ←' : 'Register as marketer ←'}
                </span>
              </div>

              {/* Feature 3 - Customer (زبون) */}
              <div
                className="card card-hover-lift p-8 rounded-2xl transition-all duration-300 group cursor-pointer border-2 border-transparent hover:border-palma-primary/20"
                onClick={onJoinCustomer}
              >
                <div className="w-16 h-16 bg-palma-primaryLight rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-palma-primary/10 transition-all duration-300 shadow-soft">
                  <ShoppingBag className="w-8 h-8 text-palma-navy" />
                </div>
                <h3 className="font-heading text-xl font-black text-palma-navy mb-3">
                  {t.landing.features.customerTitle}
                </h3>
                <p className="heading-block-sub text-slate-500 mb-4">{t.landing.features.customerDesc}</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-palma-primary group-hover:underline">
                  {lang === 'ar' ? 'سجّل كزبون ←' : 'Register as customer ←'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ابدأ باستخدام بالما خلال دقائق */}
        <section className="section-bg-2 py-20 border-b border-palma-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="heading-block mb-12">
              <h2 className="heading-block-title heading-block-title-creative font-heading text-3xl sm:text-4xl">
                {lang === 'ar' ? 'ابدأ باستخدام بالما خلال دقائق' : 'Get started with Palma in minutes'}
              </h2>
              <p className="heading-block-sub max-w-xl mx-auto">
                {lang === 'ar'
                  ? 'صُمّمت بالما لتكون سهلة، مرنة، وجاهزة للاستخدام فورًا.'
                  : 'Palma is designed to be simple, flexible, and ready to use right away.'}
              </p>
              <p className="heading-block-sub max-w-xl mx-auto mt-1">
                {lang === 'ar'
                  ? 'أنشئ حسابك، أضف متجرك أو ابحث عن المنتجات، وابدأ بإدارة عملك بخطوات بسيطة.'
                  : 'Create your account, add your store or browse products, and start in a few simple steps.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: 1,
                  arTitle: 'إنشاء الحساب',
                  arDesc: 'سجّل كتاجر أو زبون أو مسوق خلال ثواني واختر نوع حسابك.',
                  enTitle: 'Create your account',
                  enDesc: 'Sign up as a merchant, customer, or marketer in seconds and choose your account type.',
                  Icon: UserPlus,
                },
                {
                  step: 2,
                  arTitle: 'أضف متجرك أو تصفّح المنتجات',
                  arDesc: 'ابنِ ملف متجرك أو استخدم البحث للوصول لأفضل المنتجات.',
                  enTitle: 'Add your store or browse',
                  enDesc: 'Set up your store profile or browse products and merchants.',
                  Icon: Store,
                },
                {
                  step: 3,
                  arTitle: 'فعّل ما تحتاجه',
                  arDesc: 'فعّل الطلبات، الترويج، أو التوصيات حسب احتياجك.',
                  enTitle: 'Enable what you need',
                  enDesc: 'Turn on orders, promotion, or recommendations as you need them.',
                  Icon: Settings,
                },
                {
                  step: 4,
                  arTitle: 'أدر عملك وتتبع الأداء',
                  arDesc: 'أدر الطلبات والأرباح وتابع نموك من مكان واحد.',
                  enTitle: 'Manage and track performance',
                  enDesc: 'Manage orders and earnings and track your growth in one place.',
                  Icon: LineChart,
                },
              ].map((item) => {
                const StepIcon = item.Icon;
                return (
                  <div
                    key={item.step}
                    className="group bg-white rounded-2xl shadow-soft border border-palma-border/60 p-7 flex flex-col gap-4 card-hover-lift hover:border-palma-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-palma-primary text-white flex items-center justify-center text-sm font-black group-hover:scale-110 transition-transform duration-300 shrink-0">
                        {item.step}
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-palma-primaryLight text-palma-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <StepIcon className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="font-heading text-lg font-black text-palma-navy">
                      {lang === 'ar' ? item.arTitle : item.enTitle}
                    </h3>
                    <p className="heading-block-sub text-slate-500 leading-relaxed">
                      {lang === 'ar' ? item.arDesc : item.enDesc}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-12">
              <button
                type="button"
                onClick={onJoinRegister}
                className="btn-primary cta-glow px-8 py-4 text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform duration-300"
              >
                {lang === 'ar' ? 'انضم لبالما' : lang === 'he' ? 'הצטרף לפלמה' : 'Join Palma'}
              </button>
            </div>
          </div>
        </section>

        {/* 4. مصمّم للتجار والأعمال */}
        <section className="section-bg-3 py-24 border-b border-palma-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="heading-block mb-16">
              <h2 className="heading-block-title heading-block-title-creative font-heading text-3xl sm:text-4xl">
                {lang === 'ar'
                  ? 'مصمّم للتجار والأعمال التي تبحث عن التنظيم والنمو'
                  : 'Built for merchants and businesses that want to grow'}
              </h2>
              <p className="heading-block-sub max-w-3xl mx-auto">
                {lang === 'ar'
                  ? 'بالما مناسب للتجار والأعمال: إدارة المتجر والمنتجات والطلبات، وضوح في العمولات والأرباح — كل ذلك داخل منصة واحدة.'
                  : 'Palma fits merchants and businesses: manage your store, products and orders, clear commissions and earnings — all in one platform.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  ar: 'الأعمال الخدماتية والمتاجر',
                  en: 'Service businesses & stores',
                  descAr: 'إدارة الطلبات والمنتجات والزبائن من مكان واحد منظّم.',
                  descEn: 'Manage orders, products, and customers from one organized place.',
                  Icon: Store,
                },
                {
                  ar: 'التجار وإدارة المتجر',
                  en: 'Merchants & store management',
                  descAr: 'كل تاجر يدير متجره ومنتجاته وطلباته من لوحة تحكّم واحدة.',
                  descEn: 'Each merchant manages their store, products and orders from one dashboard.',
                  Icon: Users,
                },
                {
                  ar: 'الشركات الناشئة والمتنامية',
                  en: 'Startups & growing businesses',
                  descAr: 'ابدأ بما تحتاجه فقط، ووسّع مع نمو نشاطك.',
                  descEn: 'Start with what you need and scale as you grow.',
                  Icon: Rocket,
                },
                {
                  ar: 'المنتجات والتصنيفات',
                  en: 'Products & categories',
                  descAr: 'عرض منتجاتك ضمن تصنيفات واضحة وتحديث الأسعار والمواصفات بسهولة.',
                  descEn: 'Display your products in clear categories and update prices and specs easily.',
                  Icon: Layers,
                },
                {
                  ar: 'المتاجر الرقمية والتجارة',
                  en: 'Digital stores & commerce',
                  descAr: 'إدارة المتجر، المنتجات والتتبّع ضمن منصة واحدة.',
                  descEn: 'Manage your store, products and tracking in one platform.',
                  Icon: Package,
                },
                {
                  ar: 'عمولة ووضوح الأسعار',
                  en: 'Commission & pricing clarity',
                  descAr: 'عمولة واضحة وفق سياسة المنصة، وشفافية في المبيعات والأرباح.',
                  descEn: 'Clear commission per platform policy, and transparency in sales and earnings.',
                  Icon: Sparkles,
                },
              ].map((item, idx) => {
                const Icon = item.Icon;
                return (
                  <div
                    key={idx}
                    className="card card-hover-lift p-6 rounded-2xl transition-all duration-300 hover:border-palma-primary/20 group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-palma-primaryLight text-palma-primary flex items-center justify-center shrink-0 group-hover:bg-palma-primary/15 group-hover:scale-110 transition-all duration-300">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-heading text-lg font-black text-palma-navy">
                        {lang === 'ar' ? item.ar : item.en}
                      </h3>
                    </div>
                    <p className="heading-block-sub text-slate-500">{lang === 'ar' ? item.descAr : item.descEn}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. أمان وموثوقية */}
        <section className="section-bg-4 py-20 border-b border-palma-border">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="heading-block">
              <h2 className="heading-block-title heading-block-title-creative font-heading text-3xl sm:text-4xl">
                {lang === 'ar' ? 'أمان وموثوقية يمكنك الاعتماد عليهما' : 'Security and reliability you can count on'}
              </h2>
              <p className="heading-block-sub max-w-3xl mx-auto">
                {lang === 'ar'
                  ? 'صُمِّمت بالما كمنصة آمنة لحماية بياناتك، متجرك، وعملياتك — مع خصوصية وتحكّم واضحين.'
                  : 'Palma is built as a secure platform to protect your data, store, and operations — with clear privacy and control.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  ar: 'أمان على مستوى المتجر',
                  en: 'Store-level security',
                  descAr: 'كل متجر وبياناته محمية بشكل مستقل ضمن المنصة.',
                  descEn: 'Each store and its data are protected independently on the platform.',
                  Icon: Shield,
                },
                {
                  ar: 'حماية البيانات والخصوصية',
                  en: 'Data protection & privacy',
                  descAr: 'يتم حفظ ومعالجة بياناتك وفق أفضل ممارسات الأمان.',
                  descEn: 'Your data is stored and processed following best security practices.',
                  Icon: Lock,
                },
                {
                  ar: 'أنواع الحسابات (تاجر / زبون / وسيط)',
                  en: 'Account types (merchant / customer / broker)',
                  descAr: 'كل نوع حساب له صلاحياته: التاجر يدير متجره، الزبون يتصفح ويطلب، الوسيط يروّج.',
                  descEn:
                    'Each account type has its permissions: merchant manages store, customer browses and orders, broker promotes.',
                  Icon: Users,
                },
                {
                  ar: 'شفافية الاستخدام',
                  en: 'Usage transparency',
                  descAr: 'تتبّع واضح للطلبات والأرباح والعمولات دون غموض.',
                  descEn: 'Clear tracking of orders, earnings, and commissions.',
                  Icon: BarChart3,
                },
                {
                  ar: 'تحقق البريد الإلكتروني',
                  en: 'Email verification',
                  descAr: 'التحقق من البريد عند التسجيل واستعادة كلمة المرور برمز آمن يُرسل إلى بريدك.',
                  descEn: 'Verify your email on signup and reset password with a secure code sent to your inbox.',
                  Icon: MailCheck,
                },
                {
                  ar: 'بنية تحتية موثوقة وقابلة للتوسّع',
                  en: 'Reliable, scalable infrastructure',
                  descAr: 'بنية حديثة تضمن الأداء والاستقرار والنمو المستقبلي.',
                  descEn: 'Modern infrastructure for performance, stability, and future growth.',
                  Icon: Server,
                },
              ].map((item, idx) => {
                const Icon = item.Icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 bg-palma-soft rounded-2xl border border-palma-border/70 p-5 card-hover-lift hover:border-palma-primary/20 transition-all duration-300 group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white border border-palma-border/80 flex items-center justify-center shrink-0 text-palma-primary group-hover:bg-palma-primaryLight group-hover:scale-105 transition-all duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-palma-navy leading-relaxed">
                        {lang === 'ar' ? item.ar : item.en}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? item.descAr : item.descEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="section-bg-7 py-24 border-y border-palma-border">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="heading-block">
              <h2 className="heading-block-title heading-block-title-creative font-heading text-3xl sm:text-4xl">
                {lang === 'ar' ? 'شو بحكوا عن بالما؟' : 'What people say about Palma'}
              </h2>
              <p className="heading-block-sub max-w-xl mx-auto">
                {lang === 'ar'
                  ? 'آراء تجار وشركات بدأت تكبر شغلها مع المنصة.'
                  : 'Stories from businesses growing with Palma.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  nameAr: 'شركة البرج للحلول التقنية',
                  roleAr: 'شركة خدمات',
                  textAr: 'بالما ساعدتنا نوصل لعملاء جدد خارج مدينتنا بدون تعقيد.',
                  nameEn: 'Al-Burj Tech',
                  roleEn: 'Service company',
                  textEn: 'Palma helped us reach new clients beyond our city with zero friction.',
                },
                {
                  nameAr: 'م. أحمد',
                  roleAr: 'صاحب متجر إلكتروني',
                  textAr: 'واجهة الاستخدام سهلة، وإدارة الطلبات أوضح بكثير من قبل.',
                  nameEn: 'Ahmed',
                  roleEn: 'Store owner',
                  textEn: 'The dashboard is simple and made managing orders much clearer.',
                },
                {
                  nameAr: 'شركة أمان للاستشارات',
                  roleAr: 'شركة استشارات',
                  textAr: 'وجودنا على بالما عزز الثقة عند العملاء وسهّل التواصل.',
                  nameEn: 'Aman Consulting',
                  roleEn: 'Consulting firm',
                  textEn: 'Being on Palma increased client trust and streamlined communication.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl shadow-soft border border-palma-border/70 p-6 flex flex-col gap-4"
                >
                  <p className="text-sm text-slate-600 leading-relaxed">
                    “{lang === 'ar' ? item.textAr : item.textEn}”
                  </p>
                  <div className="mt-2">
                    <p className="text-sm font-black text-palma-navy">{lang === 'ar' ? item.nameAr : item.nameEn}</p>
                    <p className="text-[11px] font-bold text-palma-muted uppercase tracking-widest">
                      {lang === 'ar' ? item.roleAr : item.roleEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section-bg-8 py-24 border-b border-palma-border">
          <div className="max-w-4xl mx-auto px-6 space-y-8">
            <div className="heading-block">
              <h2 className="heading-block-title heading-block-title-creative font-heading text-3xl sm:text-4xl">
                {lang === 'ar' ? 'الأسئلة الشائعة' : 'Frequently asked questions'}
              </h2>
              <p className="heading-block-sub">
                {lang === 'ar'
                  ? 'إجابات سريعة عن أهم الأسئلة حول المنصة.'
                  : 'Quick answers to the most common questions about the platform.'}
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  qAr: 'هل التسجيل مجاني؟',
                  aAr: 'نعم، إنشاء حساب أساسي مجاني. التاجر اشتراكه مجاني دائماً، والمسوق يحصل على فترة تجريبية ثم يمكنه اختيار باقة لاحقاً.',
                  qEn: 'Is registration free?',
                  aEn: 'Yes. Creating a basic account is free. Merchant subscription is always free; marketers get a trial period and can choose a plan later.',
                },
                {
                  qAr: 'كيف بصير التواصل؟',
                  aAr: 'التواصل بيصير من خلال بيانات تواصل المتجر فقط، مثل بريد المتجر الإلكتروني الموجود في ملفه داخل المنصة.',
                  qEn: 'How does communication work?',
                  aEn: 'Communication happens through the store’s own contact details only – for example the store email shown on its profile.',
                },
                {
                  qAr: 'هل في عمولة على الصفقات؟',
                  aAr: 'نعم، عند الدخول كتاجر تُحتسب عمولة 15% لصالح منصة بالما من كل منتج يتم بيعه عبر المتجر.',
                  qEn: 'Is there a commission on deals?',
                  aEn: 'Yes. As a merchant, a 15% commission is charged to Palma on every product sold through the store.',
                },
                {
                  qAr: 'ماذا عن الفاتورة الضريبية؟',
                  aAr: 'يلتزم المتجر بتقديم فاتورة ضريبية رسمية عن كل عملية بيع. في حال عدم تقديمها مع التسديد الإلكتروني، يحق لإدارة الموقع خصم نسبة إضافية 16% من قيمة المبيعات. في حال التسديد النقدي لا يُشترط تقديم فاتورة ضريبية ويُستوفى العمولة 15% فقط.',
                  qEn: 'What about tax invoices?',
                  aEn: 'The store must provide an official tax invoice for each sale. If not provided with electronic payment, the site may deduct an additional 16% of the sales value. For cash payment, a tax invoice is not required and only the 15% commission applies.',
                },
              ].map((item, idx) => (
                <details key={idx} className="group rounded-2xl border border-palma-border/70 bg-palma-soft/40 p-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="text-sm font-bold text-palma-navy">{lang === 'ar' ? item.qAr : item.qEn}</span>
                    <span className="text-xl font-black text-palma-muted group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{lang === 'ar' ? item.aAr : item.aEn}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Articles / Blog */}
        <section className="section-bg-10 py-24 border-b border-palma-border">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="heading-block">
              <h2 className="heading-block-title heading-block-title-creative font-heading text-3xl sm:text-4xl">
                {lang === 'ar'
                  ? 'مقالات من مجتمع الأعمال الفلسطيني'
                  : 'Insights from the Palestinian business community'}
              </h2>
              <p className="heading-block-sub max-w-2xl mx-auto">
                {lang === 'ar'
                  ? 'نشارك نصائح في تطوير الأعمال والتسويق وقصص نجاح فلسطينية حقيقية.'
                  : 'We share tips on business development, marketing, and real Palestinian success stories.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  tagAr: 'تطوير الأعمال',
                  titleAr: '5 خطوات لتوسيع نشاط شركتك في السوق الفلسطيني',
                  tagEn: 'Business growth',
                  titleEn: '5 steps to expand your business in the Palestinian market',
                },
                {
                  tagAr: 'تسويق',
                  titleAr: 'كيف تستخدم التسويق الرقمي لجذب زبائن جدد؟',
                  tagEn: 'Marketing',
                  titleEn: 'How to use digital marketing to attract new customers',
                },
                {
                  tagAr: 'قصص نجاح فلسطينية',
                  titleAr: 'قصة متجر بدأ من غرفة صغيرة ووصل لكل فلسطين',
                  tagEn: 'Success stories',
                  titleEn: 'A small-room store that reached all of Palestine',
                },
              ].map((item, idx) => (
                <article
                  key={idx}
                  className="bg-white rounded-2xl shadow-soft border border-palma-border/70 p-6 flex flex-col gap-3"
                >
                  <span className="inline-flex text-[10px] font-black uppercase tracking-[0.2em] text-palma-primary bg-palma-primaryLight px-3 py-1 rounded-full w-fit">
                    {lang === 'ar' ? item.tagAr : item.tagEn}
                  </span>
                  <h3 className="font-heading text-base font-black text-palma-navy leading-snug">
                    {lang === 'ar' ? item.titleAr : item.titleEn}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'مقال قريباً... اشترك بنشرتنا البريدية ليصلك كل جديد.'
                      : 'Full article coming soon. Subscribe to stay updated.'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 8. ماذا تنتظر؟! ابدأ الآن – مثل Placio: CTA نهائي + ثقة */}
        <section className="py-20 bg-palma-primary text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="heading-block mb-8">
              <h2 className="font-heading text-2xl sm:text-4xl font-black mb-2 text-white">
                {lang === 'ar'
                  ? 'ماذا تنتظر؟! ابدأ الآن ببناء متجرك'
                  : 'What are you waiting for? Start building your store now'}
              </h2>
              <p className="heading-block-sub text-white/80 max-w-2xl mx-auto">
                {lang === 'ar'
                  ? 'ابدأ بتنظيم عملك، إدارة منتجاتك، وتشغيل متجرك — كل ذلك من خلال منصة واحدة صُمِّمت لتنمو معك.'
                  : 'Start organizing your business, managing your products, and running your store — all through one platform built to grow with you.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <button
                type="button"
                onClick={onJoinMerchant}
                className="w-full sm:w-auto bg-white text-palma-primary px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all duration-300 cta-glow"
              >
                {lang === 'ar' ? 'ابدأ الآن مجاناً' : 'Start free now'}
              </button>
              <button
                type="button"
                onClick={onLoginClick}
                className="w-full sm:w-auto bg-white/10 backdrop-blur border border-white/20 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all"
              >
                {lang === 'ar' ? 'تواصل معنا' : 'Contact us'}
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-white/90 text-sm font-medium">
              <span className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>{' '}
                {lang === 'ar' ? 'إمكانية الإلغاء في أي وقت' : 'Cancel anytime'}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span> {lang === 'ar' ? 'مجاناً للتجربة' : 'Free to try'}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span> {lang === 'ar' ? 'جاهز خلال دقائق' : 'Ready in minutes'}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — تنسيق موحّد: أعمدة بمحاذاة واحدة وسطر سفلي واحد */}
      <footer id="contact" className="footer-pattern border-t border-slate-200/80 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 items-start">
          {/* عمود 1: اللوجو + النص */}
          <div className={`flex flex-col gap-4 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
            <Logo size="medium" />
            <p className="text-palma-muted text-sm font-medium leading-relaxed max-w-xs">{t.footer.about}</p>
          </div>
          {/* عمود 2: روابط سريعة */}
          <div className={`flex flex-col gap-4 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-navy">{t.footer.links}</h5>
            <ul className="space-y-2.5 text-xs font-bold text-palma-muted">
              <li
                onClick={onJoinMerchant}
                className="hover:text-palma-primary cursor-pointer transition-colors duration-200"
              >
                {t.nav.merchant}
              </li>
              <li
                onClick={onJoinBroker}
                className="hover:text-palma-primary cursor-pointer transition-colors duration-200"
              >
                {t.nav.broker}
              </li>
              <li className="hover:text-palma-primary cursor-pointer transition-colors duration-200">
                {t.nav.contact}
              </li>
            </ul>
          </div>
          {/* عمود 3: تواصل + أيقونات */}
          <div className={`flex flex-col gap-4 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-navy">{t.nav.contact}</h5>
            <div className="space-y-1 text-sm font-bold text-palma-muted">
              <a
                href={`mailto:${FOOTER_CONTACT_EMAIL}`}
                className="text-palma-primary hover:underline cursor-pointer block"
              >
                {FOOTER_CONTACT_EMAIL}
              </a>
              <a
                href={`tel:${FOOTER_CONTACT_PHONE}`}
                className="block text-palma-muted hover:text-palma-primary transition-colors"
              >
                {lang === 'ar' ? (
                  <>
                    هاتف: <span dir="ltr">{FOOTER_CONTACT_PHONE_DISPLAY}</span>
                  </>
                ) : (
                  <>
                    Phone: <span dir="ltr">{FOOTER_CONTACT_PHONE_DISPLAY}</span>
                  </>
                )}
              </a>
              <p>{lang === 'ar' ? 'فلسطين 🇵🇸' : lang === 'he' ? 'פלסטין 🇵🇸' : 'Palestine 🇵🇸'}</p>
            </div>
            <p className="text-xs font-bold text-palma-muted mt-1">{lang === 'ar' ? 'تابعنا على:' : 'Follow us:'}</p>
            <div className={`flex gap-2.5 ${lang === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
              <a
                href={`https://wa.me/${FOOTER_CONTACT_PHONE.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-emerald-500 hover:scale-105 transition-all duration-300"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/people/%D8%B3%D9%88%D9%82-%D9%81%D9%84%D8%B3%D8%B7%D9%8A%D9%86-%D8%A7%D9%84%D8%B1%D9%82%D9%85%D9%8A-Palma/61586428723394/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-palma-primary hover:scale-105 transition-all duration-300"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/palma.ps26"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-pink-500 hover:scale-105 transition-all duration-300"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
        {/* سطر واحد للحقوق والروابط — محاذاة أفقية واحدة */}
        <div className="max-w-7xl mx-auto px-6 pt-10 mt-10 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-palma-muted uppercase tracking-widest order-2 sm:order-1">
            {lang === 'ar'
              ? `© ${new Date().getFullYear()} فلسطين 🇵🇸`
              : lang === 'he'
                ? `© ${new Date().getFullYear()} פלסטין 🇵🇸`
                : `© ${new Date().getFullYear()} Palestine 🇵🇸`}
          </p>
          <div className="flex gap-6 sm:gap-8 text-[9px] font-black uppercase text-palma-muted/60 order-1 sm:order-2">
            <span className="hover:text-palma-navy cursor-pointer transition-colors">{t.footer.privacy}</span>
            <span
              onClick={onOpenTerms}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onOpenTerms?.()}
              className="hover:text-palma-navy cursor-pointer transition-colors"
            >
              {t.footer.terms}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicWebsite;
