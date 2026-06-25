import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

function requiredApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_API_BASE_URL in admin-panel/.env');
  }
  return raw;
}

function requiredSessionStorageKey() {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  // Fail-open in production deployments: use a stable default to avoid a hard crash
  // if the env var wasn't configured in Vercel.
  if (!raw || raw === 'undefined' || raw === 'null') return 'MangAfric_session';
  return raw;
}

function storageKey() {
  return requiredSessionStorageKey();
}

function apiBase() {
  return requiredApiBaseUrl();
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
const AUTH_CONTEXT_GLOBAL_KEY = '__MangAfric_auth_context__';

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
  const key = storageKey();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem(key);
    }
  }, [key]);

  useEffect(() => {
    const token = String(user?.token || '').trim();
    const role = String(user?.role || '').trim();
    if (user && (!token || !role)) {
      localStorage.removeItem(key);
      setUser(null);
    }
  }, [user, key]);

  const persist = useCallback((next) => {
    setUser(next);
    if (next) localStorage.setItem(key, JSON.stringify(next));
    else localStorage.removeItem(key);
  }, [key]);

  const logout = useCallback(() => persist(null), [persist]);

  const login = useCallback(
    async ({ email, password }) => {
      const res = await request('/auth/login', { method: 'POST', body: { email, password } });
      const token = String(res?.token || '').trim();
      const role = String(res?.role || '').trim();
      if (!token || !role) throw new Error("Compte invalide (token/role manquant).");
      persist({
        id: res.id,
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        token: token,
        mustChangePassword:
          Boolean(res?.mustChangePassword) || Boolean(res?.must_change_password),
      });
      return res;
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && String(user?.token || '').trim() && String(user?.role || '').trim()),
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

