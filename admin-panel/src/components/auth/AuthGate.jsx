import { useEffect, useMemo, useState } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

export default function AuthGate({ children }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const roleOk = String(user?.role || '') === 'admin';
    const mustChangePassword = Boolean(user?.mustChangePassword);
    const ok = isAuthenticated && roleOk && !mustChangePassword;
    setOpen(!ok);
    if (isAuthenticated && !roleOk) logout();
  }, [isAuthenticated, user, logout]);

  const onClose = useMemo(() => {
    // Panels require auth: ignore close when unauthenticated or password change required.
    if (!(isAuthenticated && String(user?.role || '') === 'admin') || Boolean(user?.mustChangePassword))
      return () => {};
    return () => setOpen(false);
  }, [isAuthenticated, user]);

  return (
    <>
      {children}
      <AuthModal isOpen={open} initialMode="login" onClose={onClose} />
    </>
  );
}

