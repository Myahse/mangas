import { useMemo } from 'react';
import { useLocale, type Locale } from '../hooks/useLocale';

type Dict = Record<string, string>;

const DICT: Record<Locale, Dict> = {
  fr: {
    'common.preferences': 'Préférences',
    'common.language': 'Langue',
    'common.currency': 'Devise',
    'common.done': 'Terminé',
    'nav.browse': 'Parcourir',
    'nav.genres': 'Genres',
    'nav.new': 'Nouveautés',
    'nav.popular': 'Populaire',
  },
  en: {
    'common.preferences': 'Preferences',
    'common.language': 'Language',
    'common.currency': 'Currency',
    'common.done': 'Done',
    'nav.browse': 'Browse',
    'nav.genres': 'Genres',
    'nav.new': 'New',
    'nav.popular': 'Popular',
  },
  ja: {
    'common.preferences': '設定',
    'common.language': '言語',
    'common.currency': '通貨',
    'common.done': '完了',
    'nav.browse': '探す',
    'nav.genres': 'ジャンル',
    'nav.new': '新着',
    'nav.popular': '人気',
  },
};

export function useI18n() {
  const { locale } = useLocale();
  const dict = DICT[locale];

  const t = useMemo(() => {
    return (key: string, fallback?: string) => dict[key] ?? fallback ?? key;
  }, [dict]);

  return { locale, t };
}

