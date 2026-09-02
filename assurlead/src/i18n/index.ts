import fr, { type TranslationKey } from './fr';
import en from './en';
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from './config';

const DICTIONARIES: Record<Locale, Partial<Record<TranslationKey, string>>> = { fr, en };

export type Translator = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * Adding a language: create `src/i18n/<code>.ts` exporting a
 * `Partial<Record<TranslationKey, string>>`, register it here and in
 * `src/i18n/config.ts`. Missing keys fall back to French.
 */
export function createTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  const dict = DICTIONARIES[locale] ?? fr;
  return (key, vars) => {
    let value: string = dict[key] ?? fr[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) value = value.replaceAll(`{${k}}`, String(v));
    }
    return value;
  };
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE.fr;
}

export type { TranslationKey, Locale };
export { DEFAULT_LOCALE };
