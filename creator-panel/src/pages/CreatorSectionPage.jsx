import { Link, useLocation } from 'react-router-dom';
import './CreatorSectionPage.css';

const TITLES = {
  '/': 'Panneau créateur',
};

export default function CreatorSectionPage() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'Panneau créateur';

  return (
    <div className="account-section container">
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span>{title}</span>
      </nav>
      <h1 className="account-section__title">{title}</h1>
      <p className="account-section__lead">
        Base du panneau créateur
      </p>
    </div>
  );
}
