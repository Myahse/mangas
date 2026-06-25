import { useMemo } from 'react';
import { useLocale } from '../hooks/useLocale.js';

const DICT = {
  fr: {
    common: {
      apiMode: 'Mode API',
      preferences: 'Préférences',
      language: 'Langue',
      currency: 'Devise',
      done: 'Terminé',
    },
    nav: {
      overview: 'Aperçu',
      heroAds: 'Bannières (Hero)',
      notifications: 'Notifications',
      systemNotices: 'Annonces système',
    },
  },
  en: {
    common: {
      apiMode: 'API mode',
      preferences: 'Preferences',
      language: 'Language',
      currency: 'Currency',
      done: 'Done',
    },
    nav: {
      overview: 'Overview',
      heroAds: 'Hero ads',
      notifications: 'Notifications',
      systemNotices: 'System notices',
    },
  },
  ja: {
    common: {
      apiMode: 'API',
      preferences: '設定',
      language: '言語',
      currency: '通貨',
      done: '完了',
    },
    nav: {
      overview: '概要',
      heroAds: 'ヒーロー広告',
      notifications: '通知',
      systemNotices: 'システム通知',
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

