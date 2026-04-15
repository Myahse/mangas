import { useMemo } from 'react';
import { useLocale } from '../hooks/useLocale.js';

const DICT = {
  fr: {
    common: {
      localMode: 'Mode local',
      preferences: 'Préférences',
      language: 'Langue',
      currency: 'Devise',
      done: 'Terminé',
    },
    nav: {
      overview: 'Aperçu',
      requests: 'Demandes',
      creators: 'Créateurs',
      submissions: 'Soumissions',
      users: 'Utilisateurs',
      content: 'Contenu',
    },
  },
  en: {
    common: {
      localMode: 'Local mode',
      preferences: 'Preferences',
      language: 'Language',
      currency: 'Currency',
      done: 'Done',
    },
    nav: {
      overview: 'Overview',
      requests: 'Requests',
      creators: 'Creators',
      submissions: 'Submissions',
      users: 'Users',
      content: 'Content',
    },
  },
  ja: {
    common: {
      localMode: 'ローカル',
      preferences: '設定',
      language: '言語',
      currency: '通貨',
      done: '完了',
    },
    nav: {
      overview: '概要',
      requests: 'リクエスト',
      creators: 'クリエイター',
      submissions: '提出',
      users: 'ユーザー',
      content: 'コンテンツ',
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

