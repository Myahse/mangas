import { Link } from 'react-router-dom';
import './CreatorSectionPage.css';

export default function NotFoundPage() {
  return (
    <div className="account-section container">
      <nav className="account-section__crumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true"> / </span>
        <span>Page introuvable</span>
      </nav>
      <h1 className="account-section__title">404</h1>
      <p className="account-section__lead">Cette page n’existe pas.</p>
      <Link to="/" className="account-section__inline-link">
        Retour à l’accueil
      </Link>
    </div>
  );
}
