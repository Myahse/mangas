import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'MangAfriq_support_theme';

function getSystemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

function applyTheme(mode) {
  const root = document.documentElement;
  const isDark = mode === 'dark' || (mode === 'system' && getSystemPrefersDark());
  root.classList.toggle('dark', isDark);
}

export function useTheme() {
  const [mode, setMode] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system'
      ? saved
      : 'system';
  });

  const resolved = useMemo(() => {
    const isDark = mode === 'dark' || (mode === 'system' && getSystemPrefersDark());
    return isDark ? 'dark' : 'light';
  }, [mode]);

  useEffect(() => {
    applyTheme(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mql) return;
    const handler = () => applyTheme('system');
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [mode]);

  return { mode, resolved, setMode };
}

