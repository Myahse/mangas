import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AccountSectionPage.css';

const TITLES = {
  '/compte': 'Mon espace',
  '/compte/abonnements': 'Mes abonnements',
  '/compte/favoris': 'Mes favoris',
  '/compte/profil': 'Mon profil',
};

export default function AccountSectionPage() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'Compte';
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="account-section container">
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span>{title}</span>
      </nav>
      <h1 className="account-section__title">{title}</h1>

      <div style={{ marginTop: 16 }}>
        {isAuthenticated && user ? (
          <div className="account-section__card">
            <div style={{ fontWeight: 900 }}>Connecté en tant que</div>
            <div style={{ marginTop: 6 }}>
              <div><strong>Nom</strong>: {user.displayName}</div>
              <div><strong>Email</strong>: {user.email}</div>
              <div><strong>Rôle</strong>: {user.role}</div>
            </div>
          </div>
        ) : (
          <div className="account-section__card">
            <div style={{ fontWeight: 900 }}>Vous n’êtes pas connecté</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Connectez-vous depuis le bouton “Connexion” en haut.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
