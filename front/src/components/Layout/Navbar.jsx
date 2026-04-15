import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ChevronDown, Sun, Moon, User } from 'lucide-react';
import { useFetch, fetchAllManga, fetchGenres } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18n';
import { useAuth } from '../../context/AuthContext';
import { CREATOR_PANEL_URL } from '../../config/publicUrls';
import AuthModal from '../auth/AuthModal';
import PreferencesModal from '../modals/PreferencesModal';
import './Navbar.css';

/** Si `db.json` est vide ou lent : la grille Genres reste utilisable. */
const FALLBACK_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Isekai', 'Shonen',
];

/** Pile de démo (aperçu visuel) quand aucun manga ne correspond encore au genre survolé. */
function buildMockGenrePreview(genre, count = 6) {
  const safe = genre.replace(/\s+/g, '-');
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-genre-${safe}-${i}`,
    title: `Série démo — ${genre} ${i + 1}`,
    rating: (8.0 + (i % 5) * 0.15).toFixed(1),
    cover: `https://picsum.photos/seed/mg-${safe}-${i}/100/140`,
    href: `/browse?genre=${encodeURIComponent(genre)}`,
    isMock: true,
  }));
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredGenre, setHoveredGenre] = useState(null);
  const [mobileGenresOpen, setMobileGenresOpen] = useState(false);
  const [mobilePreviewGenre, setMobilePreviewGenre] = useState(null);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const { resolved, setMode } = useTheme();
  const { label: localeLabel } = useLocale();
  const { label: currencyLabel } = useCurrency();
  const { t } = useI18n();

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

  useEffect(() => {
    if (!menuOpen) {
      setMobileGenresOpen(false);
      setMobilePreviewGenre(null);
    }
  }, [menuOpen]);

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
  const { data: allManga } = useFetch(fetchAllManga);

  const displayGenres = genres?.length ? genres : FALLBACK_GENRES;

  const previewGenre = menuOpen && mobileGenresOpen ? mobilePreviewGenre : hoveredGenre;

  const genrePreviewRows = useMemo(() => {
    if (!previewGenre) return [];
    const real =
      allManga?.length > 0
        ? [...allManga]
            .filter((m) => m.genres.includes(previewGenre))
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
            .slice(0, 8)
            .map((m) => ({
              id: m.id,
              title: m.title,
              rating: String(m.rating),
              cover: m.cover,
              href: `/manga/${m.slug}`,
              isMock: false,
            }))
        : [];
    if (real.length > 0) return real;
    return buildMockGenrePreview(previewGenre, 6);
  }, [previewGenre, allManga]);

  const navLinks = [
    { label: t('nav.browse', 'Browse'), to: '/browse' },
    /* Pas de `to` : /genres n’existe pas en route — évite 404 au clic (mobile / touch). */
    { label: t('nav.genres', 'Genres'), hasDropdown: true },
    { label: t('nav.new', 'New'), to: '/browse?sort=new' },
    { label: t('nav.popular', 'Popular'), to: '/browse?sort=popular' },
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
          {navLinks.map((link) => (
            <div key={link.label} className="navbar__nav-item">
              {link.hasDropdown ? (
                <span
                  className="navbar__link navbar__link--dropdown"
                  tabIndex={0}
                  role="button"
                  aria-haspopup="true"
                  aria-label={`${link.label}, ouvrir le menu`}
                >
                  {link.label}
                  <ChevronDown size={14} aria-hidden />
                </span>
              ) : (
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `navbar__link${isActive ? ' navbar__link--active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              )}
              {link.hasDropdown && (
                <div
                  className="navbar__dropdown navbar__dropdown--genres"
                  onMouseLeave={() => setHoveredGenre(null)}
                >
                  <div className="navbar__dropdown-inner">
                    <div className="navbar__dropdown-grid">
                      {displayGenres.slice(0, 16).map((g) => (
                        <Link
                          key={g}
                          to={`/browse?genre=${encodeURIComponent(g)}`}
                          className={`navbar__dropdown-item${hoveredGenre === g ? ' navbar__dropdown-item--active' : ''}`}
                          onMouseEnter={() => setHoveredGenre(g)}
                          onFocus={() => setHoveredGenre(g)}
                        >
                          {g}
                        </Link>
                      ))}
                    </div>
                    <aside className="navbar__dropdown-preview" aria-live="polite">
                      {hoveredGenre ? (
                        <>
                          <p className="navbar__dropdown-preview-title">{hoveredGenre}</p>
                          {genrePreviewRows.some((r) => r.isMock) && (
                            <p className="navbar__dropdown-preview-mock-label">Aperçu fictif (maquette)</p>
                          )}
                          <ul className="navbar__dropdown-stack">
                            {genrePreviewRows.map((row, index) => (
                              <li
                                key={row.id}
                                className="navbar__dropdown-stack-item"
                                style={{ zIndex: genrePreviewRows.length - index }}
                              >
                                <Link to={row.href} className="navbar__dropdown-stack-link">
                                  <img src={row.cover} alt="" className="navbar__dropdown-stack-cover" />
                                  <span className="navbar__dropdown-stack-meta">
                                    <span className="navbar__dropdown-stack-name">{row.title}</span>
                                    <span className="navbar__dropdown-stack-sub">{row.rating} ★</span>
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          <Link
                            to={`/browse?genre=${encodeURIComponent(hoveredGenre)}`}
                            className="navbar__dropdown-preview-cta"
                          >
                            Voir tout →
                          </Link>
                        </>
                      ) : (
                        <p className="navbar__dropdown-preview-hint">
                          Survolez un genre pour afficher des mangas.
                        </p>
                      )}
                    </aside>
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

          {/* Language toggle */}
          <button
            type="button"
            className="navbar__lang-btn"
            onClick={() => setPrefsOpen(true)}
            aria-label="Changer la langue"
            title="Langue"
          >
            {localeLabel} <span className="navbar__lang-btn__sep">·</span>{' '}
            <span className="navbar__lang-btn__currency">{currencyLabel}</span>
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
                  {user.role === 'reader' ? (
                    <Link
                      to="/compte/profil"
                      className="navbar__user-menu-item"
                      role="menuitem"
                      onClick={closeUserMenu}
                    >
                      Mon profil
                    </Link>
                  ) : CREATOR_PANEL_URL ? (
                    <a
                      href={`${CREATOR_PANEL_URL.replace(/\/+$/, '')}/profil`}
                      className="navbar__user-menu-item navbar__user-menu-item--external"
                      role="menuitem"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeUserMenu}
                    >
                      Mon profil
                    </a>
                  ) : null}
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
          {navLinks.map((link) =>
            link.hasDropdown ? (
              <div key={link.label} className="navbar__mobile-genres">
                <button
                  type="button"
                  className="navbar__mobile-genres-toggle"
                  aria-expanded={mobileGenresOpen}
                  onClick={() =>
                    setMobileGenresOpen((o) => {
                      const next = !o;
                      if (next) setMobilePreviewGenre(null);
                      return next;
                    })
                  }
                >
                  <span>{link.label}</span>
                  <ChevronDown
                    size={18}
                    className={mobileGenresOpen ? 'navbar__mobile-chevron--open' : ''}
                    aria-hidden
                  />
                </button>
                {mobileGenresOpen && (
                  <div className="navbar__mobile-genres-body">
                    <p className="navbar__mobile-genres-hint">Choisissez un genre pour voir des titres</p>
                    <div className="navbar__mobile-genres-chips">
                      {displayGenres.slice(0, 16).map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={`navbar__mobile-genre-chip${mobilePreviewGenre === g ? ' is-active' : ''}`}
                          onClick={() => setMobilePreviewGenre((prev) => (prev === g ? null : g))}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    {mobilePreviewGenre && (
                      <div className="navbar__mobile-genres-preview">
                        <p className="navbar__dropdown-preview-title">{mobilePreviewGenre}</p>
                        {genrePreviewRows.some((r) => r.isMock) && (
                          <p className="navbar__dropdown-preview-mock-label">Aperçu fictif (maquette)</p>
                        )}
                        <ul className="navbar__dropdown-stack">
                          {genrePreviewRows.map((row, index) => (
                            <li
                              key={row.id}
                              className="navbar__dropdown-stack-item"
                              style={{ zIndex: genrePreviewRows.length - index }}
                            >
                              <Link
                                to={row.href}
                                className="navbar__dropdown-stack-link"
                                onClick={() => setMenuOpen(false)}
                              >
                                <img src={row.cover} alt="" className="navbar__dropdown-stack-cover" />
                                <span className="navbar__dropdown-stack-meta">
                                  <span className="navbar__dropdown-stack-name">{row.title}</span>
                                  <span className="navbar__dropdown-stack-sub">{row.rating} ★</span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Link
                          to={`/browse?genre=${encodeURIComponent(mobilePreviewGenre)}`}
                          className="navbar__dropdown-preview-cta"
                          onClick={() => setMenuOpen(false)}
                        >
                          Voir tout →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                className="navbar__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ),
          )}
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
              {user.role === 'reader' ? (
                <Link to="/compte/profil" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  Mon profil
                </Link>
              ) : CREATOR_PANEL_URL ? (
                <a
                  href={`${CREATOR_PANEL_URL.replace(/\/+$/, '')}/profil`}
                  className="navbar__mobile-link navbar__mobile-link--external"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                >
                  Mon profil
                </a>
              ) : null}
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
    <PreferencesModal isOpen={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </>
  );
}
