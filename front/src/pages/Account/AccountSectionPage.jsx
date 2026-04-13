import { Link, useLocation } from 'react-router-dom';
import './AccountSectionPage.css';

const TITLES = {
  '/compte': 'Mon espace',
  '/compte/abonnements': 'Mes abonnements',
  '/compte/favoris': 'Mes favoris',
};

export default function AccountSectionPage() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'Compte';

  return (
    <div className="account-section container">
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span>{title}</span>
      </nav>
      <h1 className="account-section__title">{title}</h1>
      <p className="account-section__lead">
        Cette section sera reliée au backend plus tard.
      </p>
    </div>
  );
}
