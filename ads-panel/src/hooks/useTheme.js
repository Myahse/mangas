import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'MangAfric_ads_admin_theme';
const MOBILE_MQ = '(max-width: 900px)';

function getSystemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

function getIsMobile() {
  return window.matchMedia?.(MOBILE_MQ)?.matches ?? false;
}

function applyTheme(mode) {
  const root = document.documentElement;
  const isDark = mode === 'dark' || (mode === 'system' && getSystemPrefersDark());
  root.classList.toggle('dark', isDark);
}

export function useTheme() {
  const [mode, setMode] = useState(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [isMobile, setIsMobile] = useState(() => getIsMobile());

  useEffect(() => {
    const mql = window.matchMedia?.(MOBILE_MQ);
    if (!mql) return;
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);

  const effectiveMode = isMobile ? 'system' : mode;

  const resolved = useMemo(() => {
    const isDark = effectiveMode === 'dark' || (effectiveMode === 'system' && getSystemPrefersDark());
    return isDark ? 'dark' : 'light';
  }, [effectiveMode]);

  useEffect(() => {
    applyTheme(effectiveMode);
    if (!isMobile) {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [effectiveMode, isMobile, mode]);

  useEffect(() => {
    if (effectiveMode !== 'system') return;
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mql) return;
    const handler = () => applyTheme('system');
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [effectiveMode]);

  return { mode, resolved, setMode };
}
