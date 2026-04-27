import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = import.meta?.env?.VITE_SESSION_STORAGE_KEY || 'mangafrik_session';

/** Stable across Vite HMR so Provider and consumers keep the same context identity. */
const AUTH_CONTEXT_GLOBAL_KEY = '__mangafrik_auth_context__';

function getAuthContext() {
  const g = globalThis;
  if (!g[AUTH_CONTEXT_GLOBAL_KEY]) {
    g[AUTH_CONTEXT_GLOBAL_KEY] = createContext(null);
  }
  return g[AUTH_CONTEXT_GLOBAL_KEY];
}

const AuthContext = getAuthContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = useCallback((next) => {
    setUser(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(() => persist(null), [persist]);

  /** Connexion provisoire (sans backend) : traité comme lecteur. */
  const signInAfterLogin = useCallback(
    (email) => {
      const e = (email || '').trim();
      persist({
        role: 'reader',
        displayName: e.split('@')[0] || 'Lecteur',
        email: e,
      });
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      logout,
      signInAfterLogin,
    }),
    [user, logout, signInAfterLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(getAuthContext());
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

