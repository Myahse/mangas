import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from 'react';

function requiredApiBaseUrl(): string {
  const env = import.meta.env as any;
  const primary = String(env?.VITE_API_BASE_URL ?? '').trim();
  const fallback = String(env?.VITE_API_BASE_URL_DEFAULT ?? '').trim();
  const raw = primary || fallback;
  if (!raw || raw === 'undefined' || raw === 'null') {
    const keys = Object.keys(env ?? {}).sort().join(', ');
    throw new Error(
      `Missing VITE_API_BASE_URL in front/.env (available import.meta.env keys: ${keys || '(none)'})`,
    );
  }
  return raw;
}

function requiredSessionStorageKey(): string {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_SESSION_STORAGE_KEY in front/.env');
  }
  return raw;
}

function apiBase() {
  return requiredApiBaseUrl().replace(/\/$/, '');
}

async function request(path: string, { method = 'GET', body, headers }: any = {}) {
  const url = `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
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
    const msg = (payload as any)?.error || (payload as any)?.message || payload || `Request failed (${res.status})`;
    throw new Error(String(msg));
  }
  return payload as any;
}

function storageKey(): string {
  return requiredSessionStorageKey();
}

/** Stable across Vite HMR so Provider and consumers keep the same context identity. */
const AUTH_CONTEXT_GLOBAL_KEY = '__mangafrik_auth_context__';

export type AuthUserRole = 'reader' | 'creator';

export type ReaderProfile = {
  favoriteGenres: string;
  readingFrequency: 'daily' | 'weekly' | 'sometimes';
};

export type CreatorProfile = {
  penName: string;
  genres: string;
  publishingGoal: 'web' | 'print' | 'both';
};

export type AuthUser = {
  role: AuthUserRole;
  displayName: string;
  email: string;
  profile?: ReaderProfile | CreatorProfile;
  token?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  logout: () => void;
  signInAfterRegister: (payload: {
    role: AuthUserRole;
    displayName: string;
    email: string;
    profile?: ReaderProfile | CreatorProfile;
    token?: string;
  }) => void;
  login: (payload: { email: string; password: string }) => Promise<void>;
};

function getAuthContext(): Context<AuthContextValue | null> {
  const g = globalThis as typeof globalThis & {
    [AUTH_CONTEXT_GLOBAL_KEY]?: Context<AuthContextValue | null>;
  };
  if (!g[AUTH_CONTEXT_GLOBAL_KEY]) {
    g[AUTH_CONTEXT_GLOBAL_KEY] = createContext<AuthContextValue | null>(null);
  }
  return g[AUTH_CONTEXT_GLOBAL_KEY];
}

const AuthContext = getAuthContext();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const key = storageKey();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      localStorage.removeItem(key);
    }
  }, [key]);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    if (next) localStorage.setItem(key, JSON.stringify(next));
    else localStorage.removeItem(key);
  }, [key]);

  const logout = useCallback(() => persist(null), [persist]);

  const signInAfterRegister = useCallback(
    (payload: { role: AuthUserRole; displayName: string; email: string; profile?: ReaderProfile | CreatorProfile; token?: string }) => {
      persist({
        role: payload.role,
        displayName: payload.displayName.trim(),
        email: payload.email.trim(),
        profile: payload.profile,
        token: payload.token ? String(payload.token) : undefined,
      });
    },
    [persist],
  );

  const login = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const res = await request('/auth/login', { method: 'POST', body: { email, password } });
      persist({
        role: (res?.role ?? 'reader') as AuthUserRole,
        displayName: String(res?.displayName ?? email.split('@')[0] ?? 'User'),
        email: String(res?.email ?? email),
        token: String(res?.token ?? ''),
      });
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      logout,
      signInAfterRegister,
      login,
    }),
    [user, logout, signInAfterRegister, login],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(getAuthContext());
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
