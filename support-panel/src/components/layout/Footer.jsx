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
            <Link to="/inbox" className="navbar__logo">
              <span>
                Mang<span className="navbar__logo-accent">Afrik</span>
              </span>
            </Link>
            <p className="footer__tagline">
              Support panel for triage, validation, and user assistance.
            </p>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Support</h4>
            <ul className="footer__links">
              <li>
                <Link to="/inbox">Inbox</Link>
              </li>
              <li>
                <Link to="/chat">Chat</Link>
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
            This support UI is connected to the backend API.
          </p>
        </div>
      </div>
    </footer>
  );
}

