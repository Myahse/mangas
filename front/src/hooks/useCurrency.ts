import { useEffect, useMemo, useState } from 'react';

export type Currency = 'XOF' | 'USD' | 'EUR';

const STORAGE_KEY = 'MangAfric_front_currency';
const SUPPORTED: Currency[] = ['XOF', 'USD', 'EUR'];

function normalize(value: string | null): Currency {
  return (SUPPORTED as string[]).includes(value ?? '') ? (value as Currency) : 'XOF';
}

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>(() => normalize(window.localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const label = useMemo(() => currency, [currency]);

  return { currency, label, setCurrency, supported: SUPPORTED };
}

