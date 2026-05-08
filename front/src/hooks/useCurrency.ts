import { useEffect, useMemo, useState } from 'react';

export type Currency = 'XOF' | 'USD' | 'EUR';

// Shared across all MangAfric apps (front/admin/creator/support/ads/finance)
const STORAGE_KEY = 'MangAfric_currency';
const LEGACY_KEYS = ['MangAfric_front_currency'] as const;
const SUPPORTED: Currency[] = ['XOF', 'USD', 'EUR'];

function normalize(value: string | null | undefined): Currency {
  return (SUPPORTED as string[]).includes(value ?? '') ? (value as Currency) : 'XOF';
}

function readStored(): Currency {
  const primary = window.localStorage.getItem(STORAGE_KEY);
  if (primary) return normalize(primary);
  for (const k of LEGACY_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return normalize(v);
  }
  return 'XOF';
}

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>(() => readStored());

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
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setCurrency(normalize(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const label = useMemo(() => currency, [currency]);

  return { currency, label, setCurrency, supported: SUPPORTED };
}

