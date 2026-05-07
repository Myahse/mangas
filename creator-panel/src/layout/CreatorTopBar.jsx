import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Sun, Moon, User, ChevronDown, Coins, LogOut } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLocale } from '../hooks/useLocale';
import { useCurrency } from '../hooks/useCurrency';
import PreferencesModal from '../components/modals/PreferencesModal';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../context/AuthContext';
import { creatorApi } from '../services/api';
import './CreatorTopBar.css';

export default function CreatorTopBar() {
  const location = useLocation();
  const { resolved, setMode } = useTheme();
  const { label: localeLabel } = useLocale();
  const { label: currencyLabel } = useCurrency();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { t } = useI18n();
  const { user, isAuthenticated, logout } = useAuth();
  const [walletBalance, setWalletBalance] = useState(null);
  const isCreator = isAuthenticated && String(user?.role || '').toLowerCase() === 'creator';
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const isSeriesStatusActive = (() => {
    if (location.pathname !== '/publications') return false;
    const tab = new URLSearchParams(location.search).get('tab');
    return (tab || '').toLowerCase() === 'series';
  })();

  useEffect(() => {
    if (!isAuthenticated) {
      setWalletBalance(null);
      setUserMenuOpen(false);
      return;
    }
    let cancelled = false;
    creatorApi
      .wallet()
      .then((w) => {
        if (cancelled) return;
        const bal = typeof w?.balance === 'number' ? w.balance : null;
        setWalletBalance(bal);
      })
      .catch(() => {
        if (cancelled) return;
        setWalletBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    const onPointerDown = (e) => {
      const el = userMenuRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setUserMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [userMenuOpen]);

  return (
    <>
      <header className="creator-topbar">
        <div className="creator-topbar__inner container">
          <Link to="/" className="creator-topbar__logo" aria-label="MangAfric Creator">
            <span className="creator-topbar__logo-mark">
              <img className="creator-topbar__logo-img" src="/creator-panel.png" alt="MangAfric Creator" />
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
            {isAuthenticated ? (
              <div className="creator-topbar__pill creator-topbar__pill--coins" title="Coins">
                <Coins size={16} aria-hidden />
                <span>{walletBalance ?? '—'}</span>
              </div>
            ) : null}
            {isAuthenticated ? (
              <button
                type="button"
                className="creator-topbar__pill creator-topbar__pill--logout"
                onClick={() => logout()}
                title={t('common.logout', 'Logout')}
                aria-label={t('common.logout', 'Logout')}
              >
                <LogOut size={16} aria-hidden />
                <span>{t('common.logout', 'Logout')}</span>
              </button>
            ) : null}
            {isCreator && (
              <div className="creator-topbar__user" ref={userMenuRef} data-open={userMenuOpen ? 'true' : 'false'}>
                <button
                  type="button"
                  className="creator-topbar__user-trigger"
                  aria-label="Menu compte"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  <User size={18} aria-hidden />
                  <span className="creator-topbar__user-name">{user?.displayName}</span>
                  <ChevronDown size={14} className="creator-topbar__user-chevron" aria-hidden />
                </button>
                <div className="creator-topbar__user-menu" role="menu" aria-hidden={!userMenuOpen}>
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
