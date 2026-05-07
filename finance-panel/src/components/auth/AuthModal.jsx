import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from './Modal.jsx';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShowLoginForm(false);
    setError('');
    setIsBusy(false);
    setShowPassword(false);
    setLoginData({ email: '', password: '' });
  }, [isOpen]);

  const handlePrimaryClick = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!showLoginForm) {
        setShowLoginForm(true);
        return;
      }
      setIsBusy(true);
      if (!loginData.email.trim() || !loginData.password.trim()) {
        setError('Please enter both email and password.');
        return;
      }
      await login({ email: loginData.email.trim(), password: loginData.password });
      onClose?.();
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Login failed. Please try again.';
      setError(String(message));
    } finally {
      setIsBusy(false);
    }
  };

  const panelClassName = `auth-modal__panel${showLoginForm ? ' auth-modal__panel--expanded' : ''}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} overlayClassName="auth-modal__overlay" panelClassName={panelClassName}>
      <button className="auth-modal__close" onClick={onClose} aria-label="Close">
        <X size={22} />
      </button>

      <div className="auth-modal__center">
        <div className="auth-modal__brand" aria-label="MangaAfrik Finance">
          <span>Manga</span>
          <span className="auth-modal__brand-accent">Afrik</span>
        </div>
        <p className="auth-modal__tagline">Sign in to access the finance panel.</p>

        <div className={`auth-modal__spacer${showLoginForm ? ' auth-modal__spacer--open' : ''}`}>
          {showLoginForm ? (
            <form className="auth-modal__form auth-modal__form--login" onSubmit={handlePrimaryClick}>
              <div className="auth-modal__field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="auth-modal__field">
                <label htmlFor="auth-password">Password</label>
                <div className="auth-modal__password">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-modal__pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <div className="auth-modal__error">{error}</div>}
            </form>
          ) : null}
        </div>
      </div>

      <button className="auth-modal__primary" onClick={handlePrimaryClick} disabled={isBusy} type="button">
        {showLoginForm ? (isBusy ? 'Signing in…' : 'Sign in') : 'Login with Email'}
      </button>

      <div className="auth-modal__footer">
        <p>MangaAfrik © 2026 — Finance Panel.</p>
      </div>
    </Modal>
  );
}

