import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';

import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, canClose = false }) {
  const { login, changePassword } = useAuth();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({ oldPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setIsBusy(false);
    setShowPassword(false);
    setLoginData({ email: '', password: '' });
    setForcePasswordChange(false);
    setPasswordChangeData({ oldPassword: '', newPassword: '' });
  }, [isOpen]);

  const handlePrimaryClick = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setIsBusy(true);
      if (forcePasswordChange) {
        const email = loginData.email.trim();
        const oldPw = passwordChangeData.oldPassword || loginData.password;
        const newPw = passwordChangeData.newPassword;
        if (!email || !oldPw || !newPw.trim()) {
          setError('Veuillez saisir votre ancien mot de passe et un nouveau.');
          return;
        }
        if (newPw.trim().length < 6) {
          setError('Nouveau mot de passe: minimum 6 caractères.');
          return;
        }
        await changePassword({ email, oldPassword: oldPw, newPassword: newPw });
        const res = await login({ email, password: newPw });
        const role = String(res?.role || '').toLowerCase();
        if (!(role === 'creator' || role === 'support' || role === 'admin')) {
          setError("Votre compte n'a pas accès au panneau créateur.");
          return;
        }
        onClose?.();
      } else {
        if (!loginData.email.trim() || !loginData.password.trim()) {
          setError('Veuillez saisir votre email et votre mot de passe.');
          return;
        }
        const res = await login({ email: loginData.email.trim(), password: loginData.password });
        const mustChange =
          Boolean(res?.mustChangePassword) || Boolean(res?.must_change_password);
        if (mustChange) {
          setForcePasswordChange(true);
          setPasswordChangeData({ oldPassword: loginData.password, newPassword: '' });
          setError('Vous devez changer votre mot de passe avant de continuer.');
          return;
        }
        const role = String(res?.role || '').toLowerCase();
        if (!(role === 'creator' || role === 'support' || role === 'admin')) {
          setError("Votre compte n'a pas accès au panneau créateur.");
          return;
        }
        onClose?.();
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Connexion impossible. Réessayez.';
      setError(String(message));
    } finally {
      setIsBusy(false);
    }
  };

  const panelClassName = 'auth-modal__panel auth-modal__panel--expanded';

  return (
    <Modal
      isOpen={isOpen}
      onClose={canClose ? onClose : undefined}
      overlayClassName="auth-modal__overlay"
      panelClassName={panelClassName}
    >
      {canClose ? (
        <button className="auth-modal__close" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>
      ) : null}

      <div className="auth-modal__center">
        <div className="auth-modal__brand" aria-label="MangAfriq">
          <span>Mang</span>
          <span className="auth-modal__brand-accent">Afrik</span>
        </div>
        <p className="auth-modal__tagline">Connectez-vous pour accéder au panneau créateur.</p>

        <div className="auth-modal__spacer auth-modal__spacer--open">
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
                autoComplete="email"
              />
            </div>

            <div className="auth-modal__field">
              <label htmlFor="auth-password">{forcePasswordChange ? 'Ancien mot de passe' : 'Mot de passe'}</label>
              <div className="auth-modal__password">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={forcePasswordChange ? passwordChangeData.oldPassword : loginData.password}
                  onChange={(e) =>
                    forcePasswordChange
                      ? setPasswordChangeData((p) => ({ ...p, oldPassword: e.target.value }))
                      : setLoginData((p) => ({ ...p, password: e.target.value }))
                  }
                  placeholder={forcePasswordChange ? 'Entrez votre ancien mot de passe' : 'Entrez votre mot de passe'}
                  required
                  autoComplete="current-password"
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

            {forcePasswordChange ? (
              <div className="auth-modal__field">
                <label htmlFor="auth-new-password">Nouveau mot de passe</label>
                <div className="auth-modal__password">
                  <input
                    id="auth-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordChangeData.newPassword}
                    onChange={(e) => setPasswordChangeData((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Minimum 6 caractères"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            ) : null}

            {error && <div className="auth-modal__error">{error}</div>}

            <div className="auth-modal__forgot">
              <button type="button">Mot de passe oublié ?</button>
            </div>

            <button className="auth-modal__primary" disabled={isBusy} type="submit">
              {isBusy ? (forcePasswordChange ? 'Mise à jour…' : 'Connexion…') : forcePasswordChange ? 'Mettre à jour' : 'Se connecter'}
            </button>
          </form>
        </div>

        <div className="auth-modal__footer">
          <p>MangAfriq © 2026</p>
        </div>
      </div>
    </Modal>
  );
}

