import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import './AuthModal.css';

export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const title = useMemo(() => (mode === 'login' ? 'Connexion' : 'Inscription'), [mode]);

  // Mimic the immo modal flow: first screen -> reveal login form -> optional registration form.
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
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
        if (!loginData.email.trim() || !loginData.password.trim()) {
          setError('Please enter both login and password.');
          return;
        }
        console.log('login', loginData);
        onClose?.();
        return;
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

  if (!isOpen) return null;

  return createPortal(
    <div className="auth-modal__overlay" onMouseDown={onClose} role="presentation">
      <div className={`auth-modal__panel${showRegistrationForm ? ' auth-modal__panel--register' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <button className="auth-modal__close" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>

        <div className="auth-modal__center">
          <div className="auth-modal__brand" aria-label="MangAfrik">
            <span>Mang</span>
            <span className="auth-modal__brand-accent">Afrik</span>
          </div>
          <p className="auth-modal__tagline">Connectez-vous pour reprendre votre lecture.</p>

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
          </div>
        </div>

        <div className="auth-modal__actions">
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
        </div>

        <div className={`auth-modal__footer${showRegistrationForm ? ' auth-modal__footer--up' : ''}`}>
          <p>
            MangAfrik © 2026 — <button type="button">Conditions d’utilisation</button> et{' '}
            <button type="button">Politique de confidentialité</button>.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

