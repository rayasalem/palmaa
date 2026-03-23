import React from 'react';
import { Language, translations } from '../translations';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { prefetchComponent } from '../prefetch';

interface Props {
  lang: Language;
  /** انضم لبالما — يفتح صفحة انشاء حساب (اختيار الدور) */
  onStartNow: () => void;
  onExploreProducts: () => void;
}

// صورة الهيرو — رجل يبدو كأنه يستخدم بالما (لابتوب/منصة). يمكن استبدالها بـ public/hero.png
const HERO_IMAGE = '/hero.png';

const ComingSoonHero: React.FC<Props> = ({ lang, onStartNow, onExploreProducts }) => {
  const t = translations[lang];
  const isAr = lang === 'ar';

  return (
    <section className="relative w-full min-h-0 flex flex-col lg:flex-row items-stretch overflow-hidden bg-[#f8f7fa] border-b border-slate-200/80 lg:min-h-[320px]">
      {/* خلفية خفيفة شبكية */}
      <div className="absolute inset-0 z-0 opacity-[0.4]" aria-hidden>
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(148,163,184,0.06) 25%, transparent 25%), linear-gradient(225deg, rgba(148,163,184,0.06) 25%, transparent 25%), linear-gradient(315deg, rgba(148,163,184,0.06) 25%, transparent 25%), linear-gradient(45deg, rgba(148,163,184,0.06) 25%, transparent 25%)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 0, 10px -10px, 0 10px',
          }}
        />
      </div>

      {/* جنب النص — على الجوال يظهر فقط (بدون صورة)، على الديسكتوب بجانب الصورة */}
      <div
        className={`relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-12 xl:px-20 py-4 sm:py-6 lg:py-8 min-w-0 order-1 lg:order-none ${isAr ? 'lg:order-1 lg:text-right' : 'lg:order-2 lg:text-left'}`}
      >
        <div
          className={`max-w-xl w-full mx-auto lg:mx-0 max-lg:animate-fade-in lg:opacity-100 ${isAr ? 'lg:ml-auto' : ''}`}
          style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
        >
          {/* شارة */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200/80 mb-6 ${isAr ? 'flex-row-reverse' : ''}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              {t.comingSoon.earlyAccess}
            </span>
          </div>

          {/* عنوان رئيسي — منصة تسوق */}
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] xl:text-[2.75rem] font-bold text-slate-900 tracking-tight leading-[1.25] mb-3 sm:mb-4">
            {isAr ? (
              <>
                منصتك <span className="text-palma-primary">الذكية</span> للتسوق وإدارة متجرك في مكان واحد
              </>
            ) : (
              <>
                Your <span className="text-palma-primary">smart</span> platform for shopping and managing your store in
                one place
              </>
            )}
          </h1>

          {/* وصف — منصة تسوق */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-medium leading-relaxed mb-6 sm:mb-8 max-w-lg">
            {isAr
              ? 'منصة تسوق رقمية تربط التجار بالزبائن في مكان واحد. تصفّح المنتجات، اطلب بسهولة، وتوصيل لجميع المناطق.'
              : 'A digital marketplace connecting merchants and customers. Browse products, order with ease, and get delivery across regions.'}
          </p>

          {/* أزرار — انضم لبالما (صفحة انشاء حساب) + تصفح المنتجات */}
          <div
            className={`flex flex-col sm:flex-row gap-3 sm:gap-4 ${isAr ? 'sm:flex-row-reverse lg:justify-end' : ''}`}
          >
            <button
              onClick={onStartNow}
              className="group inline-flex items-center justify-center gap-2 bg-palma-primary hover:bg-palma-primaryHover text-white font-bold min-h-[48px] sm:min-h-[52px] px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
            >
              <ArrowLeft className={`w-4 h-4 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
              <span>{lang === 'ar' ? 'انضم لبالما' : lang === 'he' ? 'הצטרף לפלמה' : 'Join Palma'}</span>
            </button>
            <button
              onClick={onExploreProducts}
              onMouseEnter={() => prefetchComponent('PublicCatalog')}
              onFocus={() => prefetchComponent('PublicCatalog')}
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-300 text-slate-700 font-bold min-h-[48px] sm:min-h-[52px] px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm uppercase tracking-wider hover:border-palma-primary hover:text-palma-primary hover:bg-palma-primaryLight/30 transition-all duration-300 w-full sm:w-auto"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'تصفّح المنتجات' : 'Browse products'}</span>
            </button>
          </div>

          {/* سطر ثقة — بالوسط على كل الشاشات */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-6 sm:mt-10 text-slate-500 text-[11px] sm:text-xs font-semibold justify-center">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> {isAr ? 'مجاناً للتجربة' : 'Free to try'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> {isAr ? 'بدون بطاقة ائتمان' : 'No credit card'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> {isAr ? 'جاهز خلال دقائق' : 'Ready in minutes'}
            </span>
          </div>
        </div>
      </div>

      {/* جنب الصورة — يظهر من lg فما فوق فقط؛ على الجوال لا تُعرض الصورة */}
      <div
        className={`hidden lg:flex relative z-10 flex-1 min-h-0 lg:min-w-[45%] w-full max-h-none overflow-hidden ${isAr ? 'lg:order-2' : 'lg:order-1'}`}
      >
        <img
          src={HERO_IMAGE}
          alt={isAr ? 'رجل يستخدم منصة بالما' : 'Person using Palma platform'}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>
    </section>
  );
};

export default ComingSoonHero;
