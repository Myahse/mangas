import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import './CreatorTopBar.css';

export default function CreatorTopBar() {
  const { resolved, setMode } = useTheme();

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
        <div className="creator-topbar__actions">
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
