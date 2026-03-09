/**
 * Lazy-load translations so the main bundle can exclude the full locale payload.
 * Use loadTranslations() or getTranslationsForLocale(lang) to load on demand.
 * For per-locale code splitting, split ar/en/he into translations/locales/ar.ts etc.
 * and use: import(`./locales/${lang}`).then(m => m.default)
 */

import type { Language } from '../translations';

type TranslationsModule = { translations: Record<Language, Record<string, any>> };
let cache: Promise<Record<Language, Record<string, any>>> | null = null;

export function loadTranslations(): Promise<Record<Language, Record<string, any>>> {
  if (!cache) {
    cache = import('../translations').then((m: TranslationsModule) => m.translations);
  }
  return cache;
}

export function getTranslationsForLocale(lang: Language): Promise<Record<string, any>> {
  return loadTranslations().then((t) => t[lang]);
}
