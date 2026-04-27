import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = import.meta?.env?.VITE_SESSION_STORAGE_KEY;
const API_BASE_URL_RAW = import.meta?.env?.VITE_API_BASE_URL;

function apiBase() {
  const raw = String(API_BASE_URL_RAW ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_API_BASE_URL in .env');
  }
  return raw;
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const base = apiBase().replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : null),
      ...(headers || null),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => '');
  if (!res.ok) {
    const msg = payload?.error || payload?.message || payload || `Request failed (${res.status})`;
    throw new Error(String(msg));
  }
  return payload;
}

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

  const login = useCallback(
    async ({ email, password }) => {
      const res = await request('/auth/login', { method: 'POST', body: { email, password } });
      persist({
        id: res.id,
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        token: res.token,
        mustChangePassword: Boolean(res.mustChangePassword),
      });
      return res;
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      logout,
      login,
    }),
    [user, logout, login],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(getAuthContext());
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

