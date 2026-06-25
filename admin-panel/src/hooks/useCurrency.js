import { useEffect, useMemo, useState } from 'react';

// Shared across all MangAfric apps (front/admin/creator/support/ads/finance)
const STORAGE_KEY = 'MangAfric_currency';
const LEGACY_KEYS = ['MangAfric_admin_currency'];
const SUPPORTED = ['XOF', 'USD', 'EUR'];

function normalize(value) {
  if (SUPPORTED.includes(value)) return value;
  return 'XOF';
}

function readStored() {
  const primary = window.localStorage.getItem(STORAGE_KEY);
  if (primary) return normalize(primary);
  for (const k of LEGACY_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return normalize(v);
  }
  return 'XOF';
}

export function useCurrency() {
  const [currency, setCurrency] = useState(() => readStored());

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
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  useEffect(() => {
    // Keep in sync across tabs/apps on the same origin.
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      setCurrency(normalize(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const label = useMemo(() => currency, [currency]);

  return { currency, label, setCurrency, supported: SUPPORTED };
}

