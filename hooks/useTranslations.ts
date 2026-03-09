/**
 * Optional hook for lazy-loaded translations per locale.
 * Uses translations/loader so the full locale payload is in a separate chunk.
 * For unchanged visual behavior, existing views keep using translations[lang] directly.
 */

import { useState, useEffect } from 'react';
import type { Language } from '../translations';
import { getTranslationsForLocale } from '../translations/loader';

const fallbackT: Record<string, any> = {
  common: { loading: 'جاري التحميل...', error: 'حدث خطأ', search: 'بحث...', noData: 'لا توجد بيانات' },
  cart: { title: 'السلة', empty: 'السلة فارغة', total: 'المجموع' },
  nav: { orders: 'الطلبات' },
  checkout: { address: 'العنوان' },
  product: { addToCart: 'أضف للسلة' },
  auth: {},
  categories: {},
};

export function useTranslations(lang: Language): { t: Record<string, any>; loading: boolean } {
  const [t, setT] = useState<Record<string, any>>(fallbackT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTranslationsForLocale(lang)
      .then((localeT) => {
        if (!cancelled) {
          setT(localeT);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setT(fallbackT);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return { t, loading };
}
