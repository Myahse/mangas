import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Link to="/series" className="creator-footer__logo">
              <span>
                Mang<span className="creator-footer__logo-accent">Afrik</span>{' '}
                <span className="creator-footer__label">Creator</span>
              </span>
            </Link>
            <p className="footer__tagline">
              Creator panel for publishing series, episodes, and managing your creator profile.
            </p>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Creator</h4>
            <ul className="footer__links">
              <li>
                <Link to="/series">Series</Link>
              </li>
              <li>
                <Link to="/episodes">Episodes</Link>
              </li>
              <li>
                <Link to="/publications">Publications</Link>
              </li>
              <li>
                <Link to="/profil">Profile</Link>
              </li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Mode</h4>
            <ul className="footer__links">
              <li>
                <span style={{ color: 'var(--text-muted)' }}>API mode</span>
              </li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Project</h4>
            <ul className="footer__links">
              <li>
                <Link to="/contact">Nous contacter</Link>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Backend (planned)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">© {year} MangaAfrik</p>
          <p className="footer__disclaimer">
            This creator UI is connected to the backend API.
          </p>
        </div>
      </div>
    </footer>
  );
}

