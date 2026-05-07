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

  const hydrateCreatorProfile = useCallback(async (token) => {
    const t = String(token || '').trim();
    if (!t) return null;
    try {
      const meReq = await request('/creator-requests/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      // The backend returns a CreatorRequestDto. Store it under user.profile for UI convenience.
      return {
        penName: meReq?.penName ?? null,
        genres: meReq?.genres ?? null,
        message: meReq?.message ?? null,
        creatorEmail: meReq?.creatorEmail ?? null,
        creatorRequestStatus: meReq?.status ?? null,
      };
    } catch (e) {
      // 401/403/404 are expected in some cases; keep profile null.
      return null;
    }
  }, []);

  useEffect(() => {
    const token = String(user?.token || '').trim();
    if (!user || !token) return;
    let cancelled = false;
    hydrateCreatorProfile(token).then((profile) => {
      if (cancelled) return;
      if (!profile) return;
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, profile: { ...(prev.profile || {}), ...profile } };
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user?.token, hydrateCreatorProfile, key]);

  const login = useCallback(
    async ({ email, password }) => {
      const res = await request('/auth/login', { method: 'POST', body: { email, password } });
      const token = String(res?.token || '').trim();
      const role = String(res?.role || '').trim();
      if (!token || !role) throw new Error("Compte invalide (token/role manquant).");
      const mustChange =
        Boolean(res?.mustChangePassword) ||
        Boolean(res?.must_change_password);
      const baseUser = {
        id: res.id,
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        token: token,
        mustChangePassword: mustChange,
      };
      const profile = await hydrateCreatorProfile(token);
      persist(profile ? { ...baseUser, profile } : baseUser);
      return res;
    },
    [persist, hydrateCreatorProfile],
  );

  const changePassword = useCallback(
    async ({ email, oldPassword, newPassword }) => {
      const e = String(email || '').trim();
      const oldPw = String(oldPassword || '');
      const newPw = String(newPassword || '');
      if (!e) throw new Error('Email requis.');
      if (!oldPw) throw new Error('Ancien mot de passe requis.');
      if (newPw.trim().length < 6) throw new Error('Nouveau mot de passe (min. 6 caractères).');
      return await request('/auth/change-password', {
        method: 'POST',
        body: { email: e, oldPassword: oldPw, newPassword: newPw },
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && String(user?.token || '').trim() && String(user?.role || '').trim()),
      logout,
      login,
      changePassword,
    }),
    [user, logout, login, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

