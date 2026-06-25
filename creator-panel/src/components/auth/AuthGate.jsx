import { useEffect, useMemo, useState } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

export default function AuthGate({ children }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const role = String(user?.role || '').toLowerCase();
    const roleOk = role === 'creator' || role === 'support' || role === 'admin';
    const mustChangePassword = Boolean(user?.mustChangePassword);
    const ok = isAuthenticated && roleOk && !mustChangePassword;
    setOpen(!ok);
    setCanClose(Boolean(ok));
    if (isAuthenticated && !roleOk) {
      // Logged in but not allowed here; clear session.
      logout();
    }
  }, [isAuthenticated, user, logout]);

  const onClose = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    const roleOk = role === 'creator' || role === 'support' || role === 'admin';
    if (!isAuthenticated || !roleOk || Boolean(user?.mustChangePassword)) return () => {};
    return () => setOpen(false);
  }, [isAuthenticated, user]);

  return (
    <>
      {children}
      <AuthModal isOpen={open} onClose={onClose} canClose={canClose} />
    </>
  );
}

