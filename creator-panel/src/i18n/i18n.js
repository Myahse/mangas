import { useMemo } from 'react';
import { useLocale } from '../hooks/useLocale';

const DICT = {
  fr: {
    common: {
      preferences: 'Préférences',
      language: 'Langue',
      currency: 'Devise',
      done: 'Terminé',
    },
    nav: {
      series: 'Séries',
      episodes: 'Épisodes',
      publications: 'Publications',
    },
    user: {
      profile: 'Mon profil',
    },
  },
  en: {
    common: {
      preferences: 'Preferences',
      language: 'Language',
      currency: 'Currency',
      done: 'Done',
    },
    nav: {
      series: 'Series',
      episodes: 'Episodes',
      publications: 'Publications',
    },
    user: {
      profile: 'My profile',
    },
  },
  ja: {
    common: {
      preferences: '設定',
      language: '言語',
      currency: '通貨',
      done: '完了',
    },
    nav: {
      series: 'シリーズ',
      episodes: 'エピソード',
      publications: '公開',
    },
    user: {
      profile: 'プロフィール',
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

