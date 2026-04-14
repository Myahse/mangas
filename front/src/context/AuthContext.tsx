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

const STORAGE_KEY = 'mangafrik_session';

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
  }) => void;
  signInAfterLogin: (email: string) => void;
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(() => persist(null), [persist]);

  const signInAfterRegister = useCallback(
    (payload: { role: AuthUserRole; displayName: string; email: string; profile?: ReaderProfile | CreatorProfile }) => {
      persist({
        role: payload.role,
        displayName: payload.displayName.trim(),
        email: payload.email.trim(),
        profile: payload.profile,
      });
    },
    [persist],
  );

  /** Connexion provisoire (sans backend) : traité comme lecteur. */
  const signInAfterLogin = useCallback(
    (email: string) => {
      const e = email.trim();
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
      signInAfterRegister,
      signInAfterLogin,
    }),
    [user, logout, signInAfterRegister, signInAfterLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(getAuthContext());
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
