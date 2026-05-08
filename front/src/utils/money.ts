import type { Currency } from '../hooks/useCurrency';
import type { Locale } from '../hooks/useLocale';

function normalizeLocale(locale: Locale): string {
  // Prefer region-specific formatting for currency while keeping language selection.
  if (locale === 'fr') return 'fr-FR';
  if (locale === 'ja') return 'ja-JP';
  return 'en-US';
}

export function formatMoney(amount: number, { currency, locale }: { currency: Currency; locale: Locale }) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount ?? '');

  const isXof = currency === 'XOF';
  const nf = new Intl.NumberFormat(normalizeLocale(locale), {
    style: 'currency',
    currency,
    // XOF has no minor units in practice; keep it clean.
    maximumFractionDigits: isXof ? 0 : undefined,
    minimumFractionDigits: isXof ? 0 : undefined,
    currencyDisplay: 'symbol',
  });
  return nf.format(n);
}

