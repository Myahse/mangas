import { Link } from 'react-router-dom';
import './Footer.css';
import './Navbar.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Link to="/overview" className="navbar__logo">
              <span>
                Mang<span className="navbar__logo-accent">Afrik</span>{' '}
                <span className="admin-muted" style={{ fontWeight: 800, opacity: 0.7 }}>
                  Ads
                </span>
              </span>
            </Link>
            <p className="footer__tagline">
              Admin panel for managing hero ads and notifications across the MangaAfrik apps.
            </p>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Manage</h4>
            <ul className="footer__links">
              <li>
                <Link to="/hero-ads">Hero ads</Link>
              </li>
              <li>
                <Link to="/notifications">Notifications</Link>
              </li>
              <li>
                <Link to="/system-notices">System notices</Link>
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
            This ads admin UI is connected to the backend API.
          </p>
        </div>
      </div>
    </footer>
  );
}

