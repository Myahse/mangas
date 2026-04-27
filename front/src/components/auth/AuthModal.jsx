import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';
import { changePassword, loginUser } from '../../services/api';

import './AuthModal.css';

export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
  }, [isOpen, initialMode]);

  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({ oldPassword: '', newPassword: '' });
  const [registrationData, setRegistrationData] = useState({
    firstName: '',
    lastName: '',
    enterpriseIdentifier: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShowLoginForm(false);
    setShowRegistrationForm(false);
    setError('');
    setIsBusy(false);
    setShowPassword(false);
    setLoginData({ email: '', password: '' });
    setForcePasswordChange(false);
    setPasswordChangeData({ oldPassword: '', newPassword: '' });
    setRegistrationData({ firstName: '', lastName: '', enterpriseIdentifier: '', description: '' });
  }, [isOpen]);

  const handlePrimaryClick = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!showLoginForm && !showRegistrationForm) {
        setMode('login');
        setShowLoginForm(true);
        return;
      }
      setIsBusy(true);
      if (showLoginForm) {
        if (forcePasswordChange) {
          if (!passwordChangeData.oldPassword.trim() || passwordChangeData.newPassword.trim().length < 6) {
            setError('Veuillez saisir votre ancien mot de passe et un nouveau (min. 6 caractères).');
            return;
          }
          await changePassword({
            email: loginData.email.trim(),
            oldPassword: passwordChangeData.oldPassword,
            newPassword: passwordChangeData.newPassword,
          });
          // Re-login after password change.
          const res = await loginUser({ email: loginData.email.trim(), password: passwordChangeData.newPassword });
          await login({ email: res?.email ?? loginData.email, password: passwordChangeData.newPassword });
          onClose?.();
          return;
        } else {
          if (!loginData.email.trim() || !loginData.password.trim()) {
            setError('Veuillez saisir votre email et votre mot de passe.');
            return;
          }
          const res = await loginUser({ email: loginData.email.trim(), password: loginData.password });
          if (res?.mustChangePassword) {
            setForcePasswordChange(true);
            setPasswordChangeData({ oldPassword: loginData.password, newPassword: '' });
            setError('Vous devez changer votre mot de passe avant de continuer.');
            return;
          }
          await login({ email: res?.email ?? loginData.email, password: loginData.password });
          onClose?.();
          return;
        }
      }
      if (showRegistrationForm) {
        if (
          !registrationData.firstName.trim() ||
          !registrationData.lastName.trim() ||
          !registrationData.enterpriseIdentifier.trim() ||
          !registrationData.description.trim()
        ) {
          setError('Please fill out all fields.');
          return;
        }
        console.log('registration_request', registrationData);
        onClose?.();
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestAccess = () => {
  
    onClose?.();
    navigate('/register');
  };

  const handleBackToLogin = () => {
    setMode('login');
    setShowRegistrationForm(false);
    setShowLoginForm(false);
    setError('');
  };

  const panelClassName = `auth-modal__panel${showRegistrationForm ? ' auth-modal__panel--register' : ''}${
    showLoginForm || showRegistrationForm ? ' auth-modal__panel--expanded' : ''
  }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="auth-modal__overlay"
      panelClassName={panelClassName}
    >
        <button className="auth-modal__close" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>

        <div className="auth-modal__center">
          <div className="auth-modal__brand" aria-label="MangAfrik">
            <span>Mang</span>
            <span className="auth-modal__brand-accent">Afrik</span>
          </div>
          <p className="auth-modal__tagline">Connectez-vous pour reprendre votre lecture.</p>

          <button
            className="auth-modal__primary auth-modal__primary--inline"
            onClick={handlePrimaryClick}
            disabled={isBusy}
            type="button"
          >
            {showRegistrationForm
              ? 'Envoyer la demande'
              : showLoginForm
                ? isBusy
                  ? 'Connexion…'
                  : 'Se connecter'
                : 'Se connecter avec Email'}
          </button>

          <div className={`auth-modal__spacer${showLoginForm || showRegistrationForm ? ' auth-modal__spacer--open' : ''}`}>
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

                {forcePasswordChange && (
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
                      />
                    </div>
                  </div>
                )}

                {error && <div className="auth-modal__error">{error}</div>}

                <div className="auth-modal__forgot">
                  <button type="button">Mot de passe oublié ?</button>
                </div>
              </form>
            )}

            {showRegistrationForm && (
              <form className="auth-modal__form auth-modal__form--register" onSubmit={handlePrimaryClick}>
                <div className="auth-modal__back-row">
                  <button type="button" className="auth-modal__back" onClick={handleBackToLogin} aria-label="Back">
                    ←
                  </button>
                </div>

                <div className="auth-modal__field">
                  <label htmlFor="reg-firstName">Prénom</label>
                  <input
                    id="reg-firstName"
                    value={registrationData.firstName}
                    onChange={(e) => setRegistrationData((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Entrez votre prénom"
                    required
                  />
                </div>

                <div className="auth-modal__field">
                  <label htmlFor="reg-lastName">Nom</label>
                  <input
                    id="reg-lastName"
                    value={registrationData.lastName}
                    onChange={(e) => setRegistrationData((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Entrez votre nom"
                    required
                  />
                </div>

                <div className="auth-modal__field">
                  <label htmlFor="reg-enterprise">Identifiant</label>
                  <input
                    id="reg-enterprise"
                    value={registrationData.enterpriseIdentifier}
                    onChange={(e) => setRegistrationData((p) => ({ ...p, enterpriseIdentifier: e.target.value }))}
                    placeholder="Entrez votre identifiant"
                    required
                  />
                </div>

                <div className="auth-modal__field">
                  <label htmlFor="reg-description">Message</label>
                  <textarea
                    id="reg-description"
                    rows={3}
                    value={registrationData.description}
                    onChange={(e) => setRegistrationData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Décrivez votre demande"
                    required
                  />
                </div>

                {error && <div className="auth-modal__error">{error}</div>}

                <div className="auth-modal__forgot">
                  <button type="button" onClick={handleBackToLogin}>
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}

            <button
              className="auth-modal__primary auth-modal__primary--form"
              onClick={handlePrimaryClick}
              disabled={isBusy}
              type="button"
            >
              {showRegistrationForm
                ? 'Envoyer la demande'
                : showLoginForm
                  ? isBusy
                    ? 'Connexion…'
                    : 'Se connecter'
                  : 'Se connecter avec Email'}
            </button>
          </div>
        </div>

        <button className="auth-modal__primary" onClick={handlePrimaryClick} disabled={isBusy} type="button">
          {showRegistrationForm
            ? 'Envoyer la demande'
            : showLoginForm
              ? isBusy
                ? 'Connexion…'
                : 'Se connecter'
              : 'Se connecter avec Email'}
        </button>

        <div className="auth-modal__divider" />

        <div className="auth-modal__register-line">
          <span>Pas encore de compte ?</span>
          <button type="button" onClick={handleRequestAccess}>
            Créer un compte
          </button>
        </div>

        <div className={`auth-modal__footer${showRegistrationForm ? ' auth-modal__footer--up' : ''}`}>
          <p>
            MangAfrik © 2026 — <button type="button">Conditions d’utilisation</button> et{' '}
            <button type="button">Politique de confidentialité</button>.
          </p>
        </div>
    </Modal>
  );
}

