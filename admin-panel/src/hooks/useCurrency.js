import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'MangAfric_admin_currency';
const SUPPORTED = ['XOF', 'USD', 'EUR'];

function normalize(value) {
  if (SUPPORTED.includes(value)) return value;
  return 'XOF';
}

export function useCurrency() {
  const [currency, setCurrency] = useState(() => normalize(window.localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const label = useMemo(() => currency, [currency]);

  return { currency, label, setCurrency, supported: SUPPORTED };
}

