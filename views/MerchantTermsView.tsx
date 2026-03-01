/**
 * عرض الشروط والأحكام الخاصة بالمتاجر المشتركة في المنصة
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { merchantTermsAr, merchantTermsEn } from '../content/merchantTerms';
import type { Language } from '../translations';

interface MerchantTermsViewProps {
  lang: Language;
  onBack: () => void;
  /** اختياري: في حال استُخدمت كخطوة قبل التسجيل، ننقل المستخدم للتسجيل بعد الموافقة */
  onAccept?: () => void;
}

export const MerchantTermsView: React.FC<MerchantTermsViewProps> = ({ lang, onBack, onAccept }) => {
  const terms = lang === 'ar' ? merchantTermsAr : merchantTermsEn;
  const isRtl = lang === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-8"
        >
          <ChevronRight className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>

        <h1 className="font-heading text-2xl font-black text-palma-navy mb-8">
          {terms.title}
        </h1>

        <div className="space-y-6 sm:space-y-8">
          {terms.sections.map((section, idx) => (
            <section key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">
                {isRtl ? `${String(section.number).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])}. ${section.title}` : `${section.number}. ${section.title}`}
              </h2>
              <ul className="space-y-2 list-disc list-inside text-slate-600 text-sm">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {onAccept ? (
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 py-4 bg-palma-primary text-white rounded-xl font-black text-sm"
            >
              {lang === 'ar'
                ? 'أوافق على الشروط والأحكام وأتابع التسجيل كتاجر'
                : 'I agree and continue to merchant registration'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-4 bg-slate-200 text-slate-800 rounded-xl font-bold text-sm"
            >
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="mt-10 w-full py-4 bg-slate-900 text-white rounded-xl font-bold"
          >
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MerchantTermsView;
