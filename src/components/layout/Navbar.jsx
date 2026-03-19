import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Menu, X, BookOpen, ChevronDown } from 'lucide-react';
import { useFetch, fetchAllManga, fetchGenres } from '../../services/api';
import './Navbar.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

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
                            <p className="navbar__search-meta">{m.author} · Ch.{m.latestChapter.number}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Login */}
          <Link to="/login" className="navbar__login-btn">Connexion</Link>

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
          <Link to="/login" className="navbar__mobile-login" onClick={() => setMenuOpen(false)}>
            Connexion
          </Link>
        </div>
      )}
    </header>
  );
}
