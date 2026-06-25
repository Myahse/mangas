import { useMemo } from 'react';
import { useLocale } from '../hooks/useLocale.js';

const DICT = {
  fr: {
    common: {
      preferences: 'Préférences',
      language: 'Langue',
      currency: 'Devise',
      done: 'Terminé',
      logout: 'Déconnexion',
    },
    nav: {
      overview: 'Aperçu',
      transactions: 'Transactions',
      reports: 'Rapports',
    },
  },
  en: {
    common: {
      preferences: 'Preferences',
      language: 'Language',
      currency: 'Currency',
      done: 'Done',
      logout: 'Logout',
    },
    nav: {
      overview: 'Overview',
      transactions: 'Transactions',
      reports: 'Reports',
    },
  },
  ja: {
    common: {
      preferences: '設定',
      language: '言語',
      currency: '通貨',
      done: '完了',
      logout: 'ログアウト',
    },
    nav: {
      overview: '概要',
      transactions: '取引',
      reports: 'レポート',
    },
  },
};

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

export function useI18n() {
  const { locale } = useLocale();

  const t = useMemo(() => {
    const dict = DICT[locale] || DICT.en;
    return (key, fallback) => getByPath(dict, key) ?? fallback ?? key;
  }, [locale]);

  return { locale, t };
}

