import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

function requiredApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_API_BASE_URL in creator-panel/.env');
  }
  return raw;
}

function requiredSessionStorageKey() {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_SESSION_STORAGE_KEY in creator-panel/.env');
  }
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

const AuthContext = createContext(null);

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

  const persist = useCallback((next) => {
    setUser(next);
    if (next) localStorage.setItem(key, JSON.stringify(next));
    else localStorage.removeItem(key);
  }, [key]);

  const logout = useCallback(() => persist(null), [persist]);

  const login = useCallback(
    async ({ email, password }) => {
      const res = await request('/auth/login', { method: 'POST', body: { email, password } });
      persist({
        id: res.id,
        email: res.email,
        displayName: res.displayName,
        role: res.role,
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

