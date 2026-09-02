'use client';
import * as React from 'react';
import { createTranslator, type Translator } from '@/i18n';
import type { Locale } from '@/i18n/config';

type Ctx = { locale: Locale; t: Translator };
const I18nContext = React.createContext<Ctx>({ locale: 'fr', t: createTranslator('fr') });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ locale, t: createTranslator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return React.useContext(I18nContext);
}
