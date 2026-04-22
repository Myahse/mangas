import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Sun, Moon, User, ChevronDown } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../hooks/useLocale';
import { useCurrency } from '../hooks/useCurrency';
import PreferencesModal from '../components/modals/PreferencesModal';
import { useI18n } from '../i18n/i18n';
import './CreatorTopBar.css';

const STORAGE_KEY = 'mangafrik_session';

export default function CreatorTopBar() {
  const location = useLocation();
  const { resolved, setMode } = useTheme();
  const { label: localeLabel } = useLocale();
  const { label: currencyLabel } = useCurrency();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { t } = useI18n();
  let session = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    session = raw ? JSON.parse(raw) : null;
  } catch {
    session = null;
  }

  const isCreator = session?.role === 'creator';
  const isSeriesStatusActive = (() => {
    if (location.pathname !== '/publications') return false;
    const tab = new URLSearchParams(location.search).get('tab');
    return (tab || '').toLowerCase() === 'series';
  })();

  return (
    <>
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
            <NavLink
              to="/series"
              className={({ isActive }) => `creator-topbar__nav-link${isActive ? ' is-active' : ''}`}
            >
              {t('nav.series', 'Series').toUpperCase()}
            </NavLink>
            <NavLink
              to="/episodes"
              className={({ isActive }) => `creator-topbar__nav-link${isActive ? ' is-active' : ''}`}
            >
              {t('nav.episodes', 'Episodes').toUpperCase()}
            </NavLink>
            <NavLink
              to="/publications"
              className={({ isActive }) => `creator-topbar__nav-link${isActive ? ' is-active' : ''}`}
            >
              {t('nav.publications', 'Publications').toUpperCase()}
            </NavLink>
            <Link
              to="/publications?tab=series"
              className={`creator-topbar__nav-link${isSeriesStatusActive ? ' is-active' : ''}`}
            >
              {t('nav.status', 'Status').toUpperCase()}
            </Link>
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
                    {t('user.profile', 'My profile')}
                  </Link>
                </div>
              </div>
            )}
            <button
              type="button"
              className="creator-topbar__pill creator-topbar__pill--lang"
              onClick={() => setPrefsOpen(true)}
              aria-label={t('common.preferences', 'Preferences')}
              title={t('common.preferences', 'Preferences')}
            >
              {localeLabel} <span className="creator-topbar__pill-lang__sep">·</span>{' '}
              <span className="creator-topbar__pill-lang__currency">{currencyLabel}</span>
            </button>
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
      <PreferencesModal isOpen={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </>
  );
}
