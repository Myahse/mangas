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
                Mang<span className="navbar__logo-accent">Afrik</span>
              </span>
            </Link>
            <p className="footer__tagline">
              Admin panel for managing the MangaAfrik platform.
            </p>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Admin</h4>
            <ul className="footer__links">
              <li>
                <Link to="/overview">Overview</Link>
              </li>
              <li>
                <Link to="/requests">Requests</Link>
              </li>
              <li>
                <Link to="/users">Users</Link>
              </li>
              <li>
                <Link to="/content">Content</Link>
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
            This admin UI is connected to the backend API.
          </p>
        </div>
      </div>
    </footer>
  );
}

