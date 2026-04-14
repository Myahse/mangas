import { Link, NavLink } from 'react-router-dom';
import { Sun, Moon, User, ChevronDown } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import './CreatorTopBar.css';

const STORAGE_KEY = 'mangafrik_session';

export default function CreatorTopBar() {
  const { resolved, setMode } = useTheme();
  let session = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    session = raw ? JSON.parse(raw) : null;
  } catch {
    session = null;
  }

  const isCreator = session?.role === 'creator';

  return (
    <header className="creator-topbar">
      <div className="creator-topbar__inner container">
        <Link to="/" className="creator-topbar__logo" aria-label="MangAfrik Creator">
          <span className="creator-topbar__logo-mark">
            <span>Mang</span>
            <span className="creator-topbar__logo-accent">Afrik</span>
            <span className="creator-topbar__badge" aria-hidden="true">
              Creator
            </span>
          </span>
        </Link>
        <nav className="creator-topbar__nav" aria-label="Navigation créateur">
          <NavLink to="/series" className={({ isActive }) => `creator-topbar__nav-link${isActive ? ' is-active' : ''}`}>
            SÉRIES
          </NavLink>
          <NavLink
            to="/episodes"
            className={({ isActive }) => `creator-topbar__nav-link${isActive ? ' is-active' : ''}`}
          >
            ÉPISODES
          </NavLink>
          <NavLink
            to="/publications"
            className={({ isActive }) => `creator-topbar__nav-link${isActive ? ' is-active' : ''}`}
          >
            PUBLICATIONS
          </NavLink>
        </nav>
        <div className="creator-topbar__actions">
          {isCreator && (
            <div className="creator-topbar__user">
              <button type="button" className="creator-topbar__user-trigger" aria-label="Menu compte">
                <User size={18} aria-hidden />
                <span className="creator-topbar__user-name">{session.displayName}</span>
                <ChevronDown size={14} className="creator-topbar__user-chevron" aria-hidden />
              </button>
              <div className="creator-topbar__user-menu" role="menu">
                <Link to="/profil" className="creator-topbar__user-item" role="menuitem">
                  Mon profil
                </Link>
              </div>
            </div>
          )}
          <button
            type="button"
            className="creator-topbar__icon-btn"
            onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
            aria-label={resolved === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={resolved === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
