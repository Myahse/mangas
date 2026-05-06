import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';

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
      if (showLoginForm) {
        if (!loginData.email.trim() || !loginData.password.trim()) {
          setError('Please enter both login and password.');
          return;
        }
        await login({ email: loginData.email, password: loginData.password });
        onClose?.();
        return;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const panelClassName = `auth-modal__panel${showLoginForm ? ' auth-modal__panel--expanded' : ''}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} overlayClassName="auth-modal__overlay" panelClassName={panelClassName}>
      <button className="auth-modal__close" onClick={onClose} aria-label="Fermer">
        <X size={22} />
      </button>

      <div className="auth-modal__center">
        <div className="auth-modal__brand" aria-label="MangAfriq">
          <span>Mang</span>
          <span className="auth-modal__brand-accent">Afrik</span>
        </div>
        <p className="auth-modal__tagline">Connectez-vous pour continuer.</p>

        <button
          className="auth-modal__primary auth-modal__primary--inline"
          onClick={handlePrimaryClick}
          disabled={isBusy}
          type="button"
        >
          {showLoginForm ? (isBusy ? 'Connexion…' : 'Se connecter') : 'Se connecter avec Email'}
        </button>

        <div className={`auth-modal__spacer${showLoginForm ? ' auth-modal__spacer--open' : ''}`}>
          {showLoginForm && (
            <form className="auth-modal__form auth-modal__form--login" onSubmit={handlePrimaryClick}>
              <div className="auth-modal__field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Entrez votre email"
                  required
                />
              </div>

              <div className="auth-modal__field">
                <label htmlFor="auth-password">Mot de passe</label>
                <div className="auth-modal__password">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Entrez votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    className="auth-modal__pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <div className="auth-modal__error">{error}</div>}

              <div className="auth-modal__forgot">
                <button type="button">Mot de passe oublié ?</button>
              </div>
            </form>
          )}

          <button className="auth-modal__primary auth-modal__primary--form" onClick={handlePrimaryClick} disabled={isBusy} type="button">
            {showLoginForm ? (isBusy ? 'Connexion…' : 'Se connecter') : 'Se connecter avec Email'}
          </button>
        </div>
      </div>

      <button className="auth-modal__primary" onClick={handlePrimaryClick} disabled={isBusy} type="button">
        {showLoginForm ? (isBusy ? 'Connexion…' : 'Se connecter') : 'Se connecter avec Email'}
      </button>

      <div className="auth-modal__footer">
        <p>
          MangAfriq © 2026 — <button type="button">Conditions d’utilisation</button> et{' '}
          <button type="button">Politique de confidentialité</button>.
        </p>
      </div>
    </Modal>
  );
}

