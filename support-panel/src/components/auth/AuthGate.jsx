import { useEffect, useMemo, useState } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

export default function AuthGate({ children }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const role = String(user?.role || '');
    const ok = isAuthenticated && (role === 'support' || role === 'admin');
    setOpen(!ok);
    if (isAuthenticated && !(role === 'support' || role === 'admin')) logout();
  }, [isAuthenticated, user, logout]);

  const onClose = useMemo(() => {
    const role = String(user?.role || '');
    if (!(isAuthenticated && (role === 'support' || role === 'admin'))) return () => {};
    return () => setOpen(false);
  }, [isAuthenticated, user]);

  return (
    <>
      {children}
      <AuthModal isOpen={open} initialMode="login" onClose={onClose} />
    </>
  );
}

