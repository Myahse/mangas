import { useEffect, useMemo, useState } from 'react';

export type Locale = 'fr' | 'en' | 'ja';

const STORAGE_KEY = 'MangAfric_front_locale';
const SUPPORTED: Locale[] = ['fr', 'en', 'ja'];

function normalize(value: string | null): Locale {
  return (SUPPORTED as string[]).includes(value ?? '') ? (value as Locale) : 'en';
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => normalize(window.localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'ja' ? 'ja' : locale;
  }, [locale]);

  const label = useMemo(() => {
    if (locale === 'fr') return 'FR';
    if (locale === 'en') return 'EN';
    return '日本語';
  }, [locale]);

  function cycle() {
    const idx = SUPPORTED.indexOf(locale);
    const next = SUPPORTED[(idx + 1) % SUPPORTED.length];
    setLocale(next);
  }

  return { locale, label, setLocale, cycle, supported: SUPPORTED };
}

