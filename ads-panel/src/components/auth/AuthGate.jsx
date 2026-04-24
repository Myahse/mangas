import { useEffect, useMemo, useState } from 'react';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';

export default function AuthGate({ children }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!isAuthenticated);
  }, [isAuthenticated]);

  const onClose = useMemo(() => {
    if (!isAuthenticated) return () => {};
    return () => setOpen(false);
  }, [isAuthenticated]);

  return (
    <>
      {children}
      <AuthModal isOpen={open} initialMode="login" onClose={onClose} />
    </>
  );
}

