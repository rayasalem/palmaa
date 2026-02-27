
import React, { useEffect, useState } from 'react';
import { productService } from '../services/productService'; // Import Service
import { Product } from '../types';
import Logo from './Logo';
import { Language, translations } from '../translations';
import ComingSoonHero from './ComingSoonHero';
import { ShoppingBag, TrendingUp, Store, Globe, ChevronDown } from 'lucide-react';

const LANG_LABELS: Record<Language, string> = { ar: 'العربية', en: 'English', he: 'עברית' };

interface PublicWebsiteProps {
  lang: Language;
  setLang: (l: Language) => void;
  onLoginClick: () => void;
  onJoinMerchant: () => void;
  onJoinBroker: () => void;
  onExploreProducts: () => void;
  onViewProduct?: (id: string) => void;
  onOpenTerms?: () => void;
}

const PublicWebsite: React.FC<PublicWebsiteProps> = ({ 
  lang, setLang, onLoginClick, onJoinMerchant, onJoinBroker, onExploreProducts, onViewProduct, onOpenTerms 
}) => {
  const t = translations[lang];
  const [products, setProducts] = useState<Product[]>([]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      // Use productService to get real data (from cloud if connected)
      const all = await productService.getAll();
      setProducts(all.slice(0, 4));
    };
    fetchFeatured();
  }, []);

  return (
    <div className="bg-palma-soft font-sans text-palma-text overflow-x-hidden min-h-screen flex flex-col" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      
      {/* Navbar - Fixed positioning to ensure it stays at the top */}
      <nav className="fixed top-0 left-0 right-0 w-full bg-white/95 backdrop-blur-xl z-[100] border-b border-palma-border shadow-soft h-20 transition-all duration-300">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <Logo size="medium" />
            <div className="flex items-center gap-4 sm:gap-6">
               <div className="relative">
                 <button onClick={() => setLangMenuOpen(prev => !prev)} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-palma-muted hover:text-palma-primary transition tracking-widest">
                   <Globe className="w-3.5 h-3.5" />
                   <span>{LANG_LABELS[lang]}</span>
                   <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {langMenuOpen && (
                   <>
                     <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setLangMenuOpen(false)} />
                     <div className="absolute top-full mt-1 end-0 min-w-[120px] py-1 rounded-lg border border-palma-border bg-white shadow-lg z-[100]">
                       {(['ar', 'en', 'he'] as const).map((l) => (
                         <button key={l} type="button" onClick={() => { setLang(l); setLangMenuOpen(false); }} className={`block w-full text-left rtl:text-right px-3 py-2 text-xs font-medium ${l === lang ? 'bg-palma-primaryLight text-palma-primary' : 'text-palma-navy hover:bg-slate-50'}`}>
                           {LANG_LABELS[l]}
                         </button>
                       ))}
                     </div>
                   </>
                 )}
               </div>
               <div className="w-px h-5 bg-palma-border" />
               <button onClick={onLoginClick} className="text-sm font-semibold text-palma-navy hover:text-palma-primary transition">{t.nav.login}</button>
               <button onClick={onJoinMerchant} className="btn-primary px-5 py-2.5 text-[10px] sm:text-xs hidden sm:inline-flex tracking-wide">{t.hero.join}</button>
            </div>
         </div>
      </nav>

      {/* Main Content - Added padding-top to account for fixed navbar height (h-20 = 5rem) */}
      <main className="flex-1 w-full pt-20">
        
        {/* Hero Section */}
        <ComingSoonHero 
          lang={lang} 
          onJoinMerchant={onJoinMerchant}
          onExploreProducts={onExploreProducts}
          onRegister={onLoginClick}
        />

        {/* Stats */}
        <section className="bg-white py-16 sm:py-24 border-y border-palma-border relative z-10">
           <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                 <div className="text-center group cursor-default">
                    <div className="text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">+500</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                      {lang === 'ar' ? 'تاجر جديد شهريا' : 'New merchants per month'}
                    </div>
                 </div>
                 <div className="text-center group cursor-default">
                    <div className="text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">10K</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                      {lang === 'ar' ? '10 الاف منتج' : '10,000 products'}
                    </div>
                 </div>
                 <div className="text-center group cursor-default">
                    <div className="text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">50K</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                      {lang === 'ar' ? '50 الف زبون شهريا' : '50K customers per month'}
                    </div>
                 </div>
                 <div className="text-center group cursor-default">
                    <div className="text-4xl sm:text-5xl font-black text-palma-navy mb-3 group-hover:scale-110 transition-transform duration-500 group-hover:text-palma-primary">1M</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-muted">
                      {lang === 'ar' ? '1 مليون زائر موثّق سنوياً' : '1M verified visits per year'}
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* New About Section – Who is Palma / What we do */}
        <section className="py-24 bg-white relative overflow-hidden border-b border-palma-border">
          <div className="absolute top-0 left-0 w-full h-full bg-palma-primaryLight/30 -skew-y-3 transform origin-top-left z-0 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16 space-y-4">
               <span className="text-palma-primary font-bold uppercase tracking-widest text-[10px] bg-palma-primaryLight px-4 py-2 rounded-full border border-palma-primary/10">
                 {t.landing.aboutSubtitle}
               </span>
               <h2 className="text-4xl md:text-5xl font-black text-palma-navy tracking-tight">
                 {t.landing.aboutTitle}
               </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Feature 1 - Merchant */}
               <div className="card p-8 rounded-2xl hover:-translate-y-1 transition-all duration-200 group">
                  <div className="w-16 h-16 bg-palma-primaryLight rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-soft">
                     <Store className="w-8 h-8 text-palma-navy" />
                  </div>
                  <h3 className="text-xl font-black text-palma-navy mb-3">{t.landing.features.merchantTitle}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{t.landing.features.merchantDesc}</p>
               </div>

               {/* Feature 2 - Broker (Highlighted) */}
               <div className="bg-palma-navy p-8 rounded-2xl shadow-card-hover hover:shadow-card-hover transition-all duration-200 group text-white relative overflow-hidden hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md relative z-10 group-hover:scale-105 transition-transform ring-1 ring-white/10">
                     <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black mb-3 relative z-10">{t.landing.features.brokerTitle}</h3>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed relative z-10">{t.landing.features.brokerDesc}</p>
               </div>

               {/* Feature 3 - Customer */}
               <div className="card p-8 rounded-2xl hover:-translate-y-1 transition-all duration-200 group">
                  <div className="w-16 h-16 bg-palma-primaryLight rounded-xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-soft">
                     <ShoppingBag className="w-8 h-8 text-palma-navy" />
                  </div>
                  <h3 className="text-xl font-black text-palma-navy mb-3">{t.landing.features.customerTitle}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{t.landing.features.customerDesc}</p>
               </div>
            </div>
          </div>
        </section>

        {/* How it works – simple 3-step flow */}
        <section className="py-20 bg-palma-soft/60 border-b border-palma-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-palma-navy">
                {lang === 'ar' ? 'كيف تعمل بالما؟' : 'How Palma works'}
              </h2>
              <p className="text-sm text-palma-muted max-w-xl mx-auto">
                {lang === 'ar'
                  ? 'خطوات بسيطة تربط بين الشركات والعملاء وتخلّي الشغل أوضح وأسهل.'
                  : 'Simple steps that connect companies and customers in a clear, easy way.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: 1,
                  arTitle: 'سجل حساب',
                  arDesc: 'افتح حساب كتاجر أو عميل خلال ثواني.',
                  enTitle: 'Create an account',
                  enDesc: 'Sign up as a business or customer in seconds.',
                },
                {
                  step: 2,
                  arTitle: 'أضف شركتك أو ابحث عن خدمة',
                  arDesc: 'ابنِ ملف شركتك أو استخدم البحث للوصول لأفضل الخدمات.',
                  enTitle: 'Add your business or search',
                  enDesc: 'Create your business profile or browse available services.',
                },
                {
                  step: 3,
                  arTitle: 'تواصل مباشرة وابدأ الشغل',
                  arDesc: 'تواصل مع العملاء أو الشركات وابدأ العمل فوراً.',
                  enTitle: 'Connect and start working',
                  enDesc: 'Contact directly and start doing business.',
                },
              ].map((item) => (
                <div key={item.step} className="bg-white rounded-2xl shadow-soft border border-palma-border/60 p-7 flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-full bg-palma-primary text-white flex items-center justify-center text-sm font-black">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-black text-palma-navy">
                    {lang === 'ar' ? item.arTitle : item.enTitle}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {lang === 'ar' ? item.arDesc : item.enDesc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Palma – trust points */}
        <section className="py-20 bg-white border-b border-palma-border">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-palma-navy">
                {lang === 'ar' ? 'ليش تختار بالما؟' : 'Why choose Palma?'}
              </h2>
              <p className="text-sm text-palma-muted max-w-xl mx-auto">
                {lang === 'ar'
                  ? 'نساعدك توصل لعملاء أكتر وتدير شغلك بثقة وسهولة.'
                  : 'We help you reach more customers and manage your work with confidence.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                lang === 'ar' ? 'منصة محلية 100%' : '100% local platform',
                lang === 'ar' ? 'وصول أسرع للعملاء' : 'Faster customer reach',
                lang === 'ar' ? 'نظام سهل الاستخدام' : 'Easy to use',
                lang === 'ar' ? 'دعم فني مباشر' : 'Direct support',
              ].map((label, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-palma-soft rounded-2xl border border-palma-border/70 p-4"
                >
                  <span className="mt-0.5 text-emerald-500 text-lg">✔️</span>
                  <p className="text-sm font-bold text-palma-navy leading-relaxed">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Preview Section */}
        <section className="py-24 sm:py-32 bg-palma-soft">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black text-palma-navy tracking-tight">
                {t.common.featured}
              </h2>
              <div className="w-16 h-1.5 bg-palma-primary mx-auto rounded-full"></div>
              <p className="text-palma-muted font-bold uppercase text-xs tracking-[0.25em]">{t.common.featuredSub}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map(p => {
                // Determine images
                const mainImage = p.images?.[0] || p.imageUrl || p.image_url || 'https://placehold.co/400x400?text=No+Image';
                const secondImage = p.images?.[1];

                return (
                  <div key={p.id} className="card rounded-2xl p-4 hover:-translate-y-1 transition-all duration-200 group">
                    <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-slate-50 mb-5 relative">
                      <img 
                        src={mainImage}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-all duration-700 ${secondImage ? 'group-hover:opacity-0' : 'group-hover:scale-110'}`} 
                        alt={p.name} 
                      />
                      {secondImage && (
                        <img 
                          src={secondImage}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" 
                          alt={`${p.name} alternate`} 
                        />
                      )}
                      
                      <div className={`absolute top-4 ${lang === 'en' ? 'right-4' : 'left-4'} bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-black shadow-lg text-palma-navy`}>
                        ₪{p.price || p.price_ils}
                      </div>
                    </div>
                    <div className="px-2 pb-2">
                      <p className="text-[9px] font-bold text-palma-primary uppercase tracking-widest mb-2 bg-palma-primaryLight px-2 py-1 rounded-lg w-fit">{p.category}</p>
                      <h4 className="font-bold text-palma-navy mb-6 text-lg tracking-tight truncate">{p.name}</h4>
                      <button onClick={() => onViewProduct && onViewProduct(p.id)} className="btn-primary w-full py-3.5 text-[10px] uppercase tracking-widest active:scale-[0.98]">
                        {t.common.details}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        {/* Testimonials / User feedback */}
        <section className="py-24 bg-palma-soft/80 border-y border-palma-border">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-palma-navy">
                {lang === 'ar' ? 'شو بحكوا عن بالما؟' : 'What people say about Palma'}
              </h2>
              <p className="text-sm text-palma-muted max-w-xl mx-auto">
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
                    <p className="text-sm font-black text-palma-navy">
                      {lang === 'ar' ? item.nameAr : item.nameEn}
                    </p>
                    <p className="text-[11px] font-bold text-palma-muted uppercase tracking-widest">
                      {lang === 'ar' ? item.roleAr : item.roleEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ – simple accordion using <details> for mobile friendliness */}
        <section className="py-24 bg-white border-b border-palma-border">
          <div className="max-w-4xl mx-auto px-6 space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-palma-navy">
                {lang === 'ar' ? 'الأسئلة الشائعة' : 'Frequently asked questions'}
              </h2>
              <p className="text-sm text-palma-muted">
                {lang === 'ar'
                  ? 'إجابات سريعة عن أهم الأسئلة حول المنصة.'
                  : 'Quick answers to the most common questions about the platform.'}
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  qAr: 'هل التسجيل مجاني؟',
                  aAr: 'نعم، إنشاء حساب أساسي مجاني، مع شهر أول مجاني لخطة الاشتراك للتجار، ثم تُعلن رسوم الباقات بشكل واضح داخل المنصة.',
                  qEn: 'Is registration free?',
                  aEn: 'Yes. Creating a basic account is free, and merchants get the first month of their subscription plan for free. Package pricing is shown clearly inside the platform.',
                },
                {
                  qAr: 'كيف بصير التواصل؟',
                  aAr: 'التواصل بيصير من خلال بيانات تواصل المتجر فقط، مثل بريد المتجر الإلكتروني الموجود في ملفه داخل المنصة.',
                  qEn: 'How does communication work?',
                  aEn: 'Communication happens through the store’s own contact details only – for example the store email shown on its profile.',
                },
                {
                  qAr: 'هل في عمولة على الصفقات؟',
                  aAr: 'نعم، عند الدخول كتاجر تُحتسب عمولة 15% لصالح منصة Palma من كل منتج يتم بيعه عبر المتجر، بالإضافة إلى رسوم الاشتراك عند تفعيل الباقات المدفوعة.',
                  qEn: 'Is there a commission on deals?',
                  aEn: 'Yes. When you join as a merchant, a 15% commission is charged to Palma on every product sold through the store, in addition to any subscription fees when paid plans are enabled.',
                },
              ].map((item, idx) => (
                <details
                  key={idx}
                  className="group rounded-2xl border border-palma-border/70 bg-palma-soft/40 p-4"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="text-sm font-bold text-palma-navy">
                      {lang === 'ar' ? item.qAr : item.qEn}
                    </span>
                    <span className="text-xl font-black text-palma-muted group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {lang === 'ar' ? item.aAr : item.aEn}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Articles / Blog – SEO content */}
        <section className="py-24 bg-palma-soft/70 border-b border-palma-border">
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black text-palma-navy">
                {lang === 'ar' ? 'مقالات من مجتمع الأعمال الفلسطيني' : 'Insights from the Palestinian business community'}
              </h2>
              <p className="text-sm text-palma-muted max-w-2xl mx-auto">
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
                  titleAr: 'كيف تستخدم التسويق الرقمي لجذب عملاء جدد؟',
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
                  <h3 className="text-base font-black text-palma-navy leading-snug">
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

        {/* Bottom CTA – grow your business */}
        <section className="py-16 bg-palma-primary text-white">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-right">
              <h2 className="text-2xl sm:text-3xl font-black">
                {lang === 'ar' ? 'جاهز تكبر شغلك؟' : 'Ready to grow your business?'}
              </h2>
              <p className="text-sm text-white/80 max-w-md md:ml-auto">
                {lang === 'ar'
                  ? 'انضم إلى شبكة التجار على بالما وابدأ شهر الاشتراك الأول مجاناً.'
                  : 'Join Palma merchants and enjoy your first subscription month for free.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onJoinMerchant}
              className="w-full md:w-auto bg-white text-palma-primary px-6 sm:px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'جاهز تكبر شغلك؟ سجل شركتك اليوم' : 'Grow your business – register your company today'}
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-palma-border py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className={`space-y-6 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
            <Logo size="medium" />
            <p className="text-palma-muted text-sm font-medium leading-relaxed max-w-xs">
              {t.footer.about}
            </p>
          </div>
          <div className={`space-y-6 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-navy">{t.footer.links}</h5>
            <ul className="space-y-3 text-xs font-bold text-palma-muted">
              <li onClick={onJoinMerchant} className="hover:text-palma-primary cursor-pointer transition-colors hover:translate-x-1 duration-300 inline-block">{t.nav.merchant}</li>
              <li onClick={onJoinBroker} className="hover:text-palma-primary cursor-pointer transition-colors hover:translate-x-1 duration-300 block">{t.nav.broker}</li>
              <li className="hover:text-palma-primary cursor-pointer transition-colors hover:translate-x-1 duration-300 block">{t.nav.contact}</li>
            </ul>
          </div>
          <div className={`space-y-4 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-palma-navy">
              {t.nav.contact}
            </h5>
            <div className="space-y-1 text-sm font-bold text-palma-muted">
              <p className="text-palma-primary hover:underline cursor-pointer">office@palma.ps</p>
              <p>{lang === 'ar' ? 'هاتف: 0599-000000' : 'Phone: +970 599 000 000'}</p>
              <p>{lang === 'ar' ? 'فلسطين 🇵🇸' : lang === 'he' ? 'פלסטין 🇵🇸' : 'Palestine 🇵🇸'}</p>
            </div>
            <div className="space-y-1 text-xs font-bold text-palma-muted">
              <p>{lang === 'ar' ? 'تابعنا على:' : 'Follow us:'}</p>
              <div className="flex gap-3 text-[11px]">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-palma-primary transition-colors">
                  Facebook
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-palma-primary transition-colors">
                  Instagram
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-palma-primary transition-colors">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-16 mt-16 border-t border-palma-border flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-bold text-palma-muted uppercase tracking-widest">{lang === 'ar' ? `© ${new Date().getFullYear()} فلسطين 🇵🇸` : lang === 'he' ? `© ${new Date().getFullYear()} פלסטין 🇵🇸` : `© ${new Date().getFullYear()} Palestine 🇵🇸`}</p>
            <div className="flex gap-8 text-[9px] font-black uppercase text-palma-muted/60">
                <span className="hover:text-palma-navy cursor-pointer transition-colors">{t.footer.privacy}</span>
                <span onClick={onOpenTerms} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpenTerms?.()} className="hover:text-palma-navy cursor-pointer transition-colors">{t.footer.terms}</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicWebsite;
