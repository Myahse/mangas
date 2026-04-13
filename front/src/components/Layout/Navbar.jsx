import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ChevronDown, Sun, Moon, User } from 'lucide-react';
import { useFetch, fetchAllManga, fetchGenres } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { CREATOR_PANEL_URL } from '../../config/publicUrls';
import AuthModal from '../auth/AuthModal';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close search on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* User menu: outside click + Escape */
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const closeUserMenu = () => setUserMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeUserMenu();
    setMenuOpen(false);
  };

  /* Live search — async depuis db.json */
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    let cancelled = false;
    const q = searchQuery.toLowerCase();
    fetchAllManga().then(list => {
      if (cancelled) return;
      setSearchResults(
        list.filter(m =>
          m.title.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q)
        ).slice(0, 6)
      );
    });
    return () => { cancelled = true; };
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const { data: genres } = useFetch(fetchGenres);

  const navLinks = [
    { label: 'Parcourir', to: '/browse' },
    { label: 'Genres', to: '/genres', hasDropdown: true },
    { label: 'Nouveautés', to: '/browse?sort=new' },
    { label: 'Populaire', to: '/browse?sort=popular' },
  ];

  return (
    <>
      <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">

        {/* Logo */}
        <Link to="/" className="navbar__logo">
    
          <span>Mang<span className="navbar__logo-accent">Afrik</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="navbar__nav">
          {navLinks.map(link => (
            <div key={link.label} className="navbar__nav-item">
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `navbar__link${isActive ? ' navbar__link--active' : ''}${link.hasDropdown ? ' navbar__link--dropdown' : ''}`
                }
              >
                {link.label}
                {link.hasDropdown && <ChevronDown size={14} />}
              </NavLink>
              {link.hasDropdown && (
                <div className="navbar__dropdown">
                  <div className="navbar__dropdown-grid">
                    {(genres ?? []).slice(0, 16).map(g => (
                      <Link
                        key={g}
                        to={`/browse?genre=${encodeURIComponent(g)}`}
                        className="navbar__dropdown-item"
                      >
                        {g}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="navbar__actions">
          {/* Search */}
          <div className="navbar__search" ref={searchRef}>
            <button
              className="navbar__icon-btn"
              onClick={() => setSearchOpen(s => !s)}
              aria-label="Recherche"
            >
              <Search size={18} />
            </button>
            {searchOpen && (
              <div className="navbar__search-box">
                <form onSubmit={handleSearchSubmit}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Rechercher un manga…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="navbar__search-input"
                  />
                </form>
                {searchResults.length > 0 && (
                  <ul className="navbar__search-results">
                    {searchResults.map(m => (
                      <li key={m.id}>
                        <Link
                          to={`/manga/${m.slug}`}
                          className="navbar__search-result"
                          onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                        >
                          <img src={m.cover} alt={m.title} className="navbar__search-thumb" />
                          <div>
                            <p className="navbar__search-title">{m.title}</p>
                            <p className="navbar__search-meta">
                              {m.author} · {m.latestChapter ? `Ch.${m.latestChapter.number}` : 'Aucun chapitre'}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            className="navbar__icon-btn"
            onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
            aria-label={resolved === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={resolved === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Compte : menu utilisateur ou connexion */}
          {isAuthenticated && user ? (
            <div className="navbar__user" ref={userMenuRef}>
              <button
                type="button"
                className="navbar__user-trigger"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="Menu compte"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <User size={18} aria-hidden />
                <span className="navbar__user-trigger-text">{user.displayName}</span>
                <ChevronDown size={14} className="navbar__user-chevron" aria-hidden />
              </button>
              {userMenuOpen && (
                <div className="navbar__user-menu" role="menu">
                  {user.role === 'reader' ? (
                    <Link
                      to="/compte"
                      className="navbar__user-menu-item"
                      role="menuitem"
                      onClick={closeUserMenu}
                    >
                      Mon espace
                    </Link>
                  ) : CREATOR_PANEL_URL ? (
                    <a
                      href={CREATOR_PANEL_URL}
                      className="navbar__user-menu-item navbar__user-menu-item--external"
                      role="menuitem"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeUserMenu}
                    >
                      Panneau créateur
                    </a>
                  ) : (
                    <span
                      className="navbar__user-menu-item navbar__user-menu-item--disabled"
                      title="Définissez VITE_CREATOR_PANEL_URL dans l’environnement"
                    >
                      Panneau créateur
                    </span>
                  )}
                  <Link
                    to="/compte/abonnements"
                    className="navbar__user-menu-item"
                    role="menuitem"
                    onClick={closeUserMenu}
                  >
                    Mes abonnements
                  </Link>
                  <Link
                    to="/compte/favoris"
                    className="navbar__user-menu-item"
                    role="menuitem"
                    onClick={closeUserMenu}
                  >
                    Favoris
                  </Link>
                  <div className="navbar__user-menu-footer" role="presentation">
                    <button type="button" className="navbar__user-logout" role="menuitem" onClick={handleLogout}>
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="navbar__login-btn"
              onClick={() => {
                setAuthMode('login');
                setAuthOpen(true);
              }}
            >
              Connexion
            </button>
          )}

          {/* Mobile burger */}
          <button
            className="navbar__burger"
            onClick={() => setMenuOpen(s => !s)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu">
          {navLinks.map(link => (
            <NavLink
              key={link.label}
              to={link.to}
              className="navbar__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="navbar__mobile-divider" />
          {isAuthenticated && user ? (
            <>
              {user.role === 'reader' ? (
                <Link to="/compte" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  Mon espace
                </Link>
              ) : CREATOR_PANEL_URL ? (
                <a
                  href={CREATOR_PANEL_URL}
                  className="navbar__mobile-link navbar__mobile-link--external"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                >
                  Panneau créateur
                </a>
              ) : (
                <span className="navbar__mobile-link navbar__mobile-link--disabled">Panneau créateur</span>
              )}
              <Link to="/compte/abonnements" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                Mes abonnements
              </Link>
              <Link to="/compte/favoris" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                Favoris
              </Link>
              <button type="button" className="navbar__mobile-logout" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : (
            <button
              type="button"
              className="navbar__mobile-login"
              onClick={() => {
                setMenuOpen(false);
                setAuthMode('login');
                setAuthOpen(true);
              }}
            >
              Connexion
            </button>
          )}
        </div>
      )}
    </header>

    <AuthModal
      isOpen={authOpen}
      initialMode={authMode}
      onClose={() => setAuthOpen(false)}
    />
    </>
  );
}
