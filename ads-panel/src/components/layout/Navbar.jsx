import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';
import { useLocale } from '../../hooks/useLocale.js';
import { useCurrency } from '../../hooks/useCurrency.js';
import PreferencesModal from '../modals/PreferencesModal.jsx';
import { useI18n } from '../../i18n/i18n.js';
import './Navbar.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { resolved, setMode } = useTheme();
  const { label: localeLabel } = useLocale();
  const { label: currencyLabel } = useCurrency();
  const { t } = useI18n();

  const navLinks = [
    { label: t('nav.overview', 'Overview'), to: '/overview' },
    { label: t('nav.heroAds', 'Hero ads'), to: '/hero-ads' },
    { label: t('nav.notifications', 'Notifications'), to: '/notifications' },
    { label: t('nav.systemNotices', 'System notices'), to: '/system-notices' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <Link to="/overview" className="navbar__logo">
          <span className="navbar__logo-mark">
            Mang<span className="navbar__logo-accent">Afrik</span>
            <span className="navbar__badge">Ads</span>
          </span>
        </Link>

        <nav className="navbar__nav" aria-label="Ads admin navigation">
          {navLinks.map((link) => (
            <div key={link.to} className="navbar__nav-item">
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `navbar__link${isActive ? ' navbar__link--active' : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="navbar__actions">
          <span className="navbar__pill">{t('common.apiMode', 'API mode')}</span>
          <button
            type="button"
            className="navbar__pill navbar__pill--lang"
            onClick={() => setPrefsOpen(true)}
            aria-label={t('common.preferences', 'Preferences')}
            title={t('common.preferences', 'Preferences')}
          >
            {localeLabel} <span className="navbar__pill-lang__sep">·</span>{' '}
            <span className="navbar__pill-lang__currency">{currencyLabel}</span>
          </button>
          <button
            type="button"
            className="navbar__icon-btn"
            onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
            aria-label={resolved === 'dark' ? 'Enable light mode' : 'Enable dark mode'}
            title={resolved === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            className="navbar__burger"
            onClick={() => setMenuOpen((s) => !s)}
            aria-label="Menu"
            type="button"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="navbar__mobile-menu">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="navbar__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      ) : null}
      <PreferencesModal isOpen={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </header>
  );
}

