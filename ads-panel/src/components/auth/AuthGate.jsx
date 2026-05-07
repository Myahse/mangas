import { useEffect, useMemo, useState } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

export default function AuthGate({ children }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const role = String(user?.role || '');
    const roleOk = role === 'ads' || role === 'admin';
    const mustChangePassword = Boolean(user?.mustChangePassword);
    const ok = isAuthenticated && roleOk && !mustChangePassword;
    setOpen(!ok);
    if (isAuthenticated && !roleOk) logout();
  }, [isAuthenticated, user, logout]);

  const onClose = useMemo(() => {
    const role = String(user?.role || '');
    const roleOk = isAuthenticated && (role === 'ads' || role === 'admin') && !Boolean(user?.mustChangePassword);
    if (!roleOk) return () => {};
    return () => setOpen(false);
  }, [isAuthenticated, user]);

  return (
    <>
      {children}
      <AuthModal isOpen={open} initialMode="login" onClose={onClose} />
    </>
  );
}

