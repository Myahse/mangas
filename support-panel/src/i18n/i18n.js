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
      inbox: 'Boîte',
      chat: 'Chat',
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
      inbox: 'Inbox',
      chat: 'Chat',
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
      inbox: '受信箱',
      chat: 'チャット',
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

