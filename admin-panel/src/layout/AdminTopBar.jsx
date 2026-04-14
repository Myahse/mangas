import { Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';

function titleFromPath(pathname) {
  if (pathname.startsWith('/overview')) return 'Overview';
  if (pathname.startsWith('/requests')) return 'Manga requests';
  if (pathname.startsWith('/users')) return 'Users';
  if (pathname.startsWith('/content')) return 'Content';
  return 'Admin';
}

export function AdminTopBar() {
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="topbar">
      <div>
        <div style={{ fontWeight: 760, fontSize: 16 }}>
          {titleFromPath(pathname)}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Manage platform data and moderation
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pill">Local mode (mock DB)</span>
        <button className="btn" type="button" onClick={toggleTheme}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          Theme
        </button>
      </div>
    </div>
  );
}
