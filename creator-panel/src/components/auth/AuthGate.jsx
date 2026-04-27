import { useEffect, useMemo, useState } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

export default function AuthGate({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ok = isAuthenticated && String(user?.role || '') === 'creator';
    setOpen(!ok);
    if (isAuthenticated && String(user?.role || '') !== 'creator') {
      // Logged in but not allowed here; clear session.
      logout();
    }
  }, [isAuthenticated, user, logout]);

  const onClose = useMemo(() => {
    if (!(isAuthenticated && String(user?.role || '') === 'creator')) return () => {};
    return () => setOpen(false);
  }, [isAuthenticated, user]);

  return (
    <>
      {children}
      <AuthModal isOpen={open} onClose={onClose} />
    </>
  );
}

