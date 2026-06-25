import { useEffect, useMemo, useState } from 'react';

// Shared across all MangAfric apps (front/admin/creator/support/ads/finance)
const STORAGE_KEY = 'MangAfric_locale';
const LEGACY_KEYS = ['MangAfric_admin_locale'];
const SUPPORTED = ['fr', 'en', 'ja'];

function defaultLocale() {
  const lang = String(navigator.language || '').toLowerCase();
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
}

function normalize(value) {
  if (SUPPORTED.includes(value)) return value;
  return defaultLocale();
}

function readStored() {
  const primary = window.localStorage.getItem(STORAGE_KEY);
  if (primary) return normalize(primary);
  for (const k of LEGACY_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return normalize(v);
  }
  return defaultLocale();
}

export function useLocale() {
  const [locale, setLocale] = useState(() => readStored());

  useEffect(() => {
    // One-time migration from legacy key(s)
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      for (const k of LEGACY_KEYS) {
        const v = window.localStorage.getItem(k);
        if (v) {
          window.localStorage.setItem(STORAGE_KEY, normalize(v));
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'ja' ? 'ja' : locale;
  }, [locale]);

  useEffect(() => {
    // Keep in sync across tabs/apps on the same origin.
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      setLocale(normalize(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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

