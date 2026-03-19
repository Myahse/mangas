import { Link, useLocation } from 'react-router-dom'
import { useHomeScroll } from '../../context/HomeScrollContext'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const homeScroll = useHomeScroll()
  const isActive = (path: string) => location.pathname === path
  const isHome = location.pathname === '/'

  const renderHomeSections = () => {
    if (!homeScroll) return null

    const count = homeScroll.sectionsCount
    return Array.from({ length: count }).map((_, index) => (
      <button
        key={index}
        type="button"
        className={`nav-link nav-section ${homeScroll.sectionIndex === index ? 'active' : ''}`}
        onClick={() => homeScroll.scrollToSection(index)}
        aria-label={`Section ${index + 1}`}
      >
        <span className="nav-section-dot" />
      </button>
    ))
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-left">
          <Link to="/" className="nav-logo">
            MangAfrik
          </Link>
        </div>
        <div className="nav-links">
          {isHome && homeScroll ? (
            renderHomeSections()
          ) : (
            <>
              <Link to="/" className={isActive('/') ? 'nav-link active' : 'nav-link'}>
                Accueil
              </Link>
              <Link to="/library" className={isActive('/library') ? 'nav-link active' : 'nav-link'}>
                Bibliothèque
              </Link>
              <Link to="/community" className={isActive('/community') ? 'nav-link active' : 'nav-link'}>
                Communauté
              </Link>
              <Link to="/create" className="nav-link">
                Créer un Manga
              </Link>
              <Link to="/profile" className={isActive('/profile') ? 'nav-link active' : 'nav-link'}>
                Profil
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
