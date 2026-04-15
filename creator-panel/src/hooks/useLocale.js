import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'mangaafrik_creator_locale';
const SUPPORTED = ['fr', 'en', 'ja'];

function normalize(value) {
  if (SUPPORTED.includes(value)) return value;
  return 'en';
}

export function useLocale() {
  const [locale, setLocale] = useState(() => normalize(window.localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'ja' ? 'ja' : locale;
  }, [locale]);

  useEffect(() => {
    // Keep the fixed topbar consistent with current language (e.g. Japanese).
    document.documentElement.dir = 'ltr';
  }, []);

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

