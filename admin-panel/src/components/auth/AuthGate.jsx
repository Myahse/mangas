import { useEffect, useMemo, useState } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

export default function AuthGate({ children }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const ok = isAuthenticated && String(user?.role || '') === 'admin';
    setOpen(!ok);
    if (isAuthenticated && String(user?.role || '') !== 'admin') logout();
  }, [isAuthenticated, user, logout]);

  const onClose = useMemo(() => {
    // Panels require auth: ignore close when unauthenticated.
    if (!(isAuthenticated && String(user?.role || '') === 'admin')) return () => {};
    return () => setOpen(false);
  }, [isAuthenticated, user]);

  return (
    <>
      {children}
      <AuthModal isOpen={open} initialMode="login" onClose={onClose} />
    </>
  );
}

