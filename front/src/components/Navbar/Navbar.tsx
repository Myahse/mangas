import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="nav">
      <div>
        <Link to="/">WebGas</Link>
        <Link to="/" className={isActive('/') ? 'active' : 'link'}>Accueil</Link>
        <Link to="/library" className={isActive('/library') ? 'active' : 'link'}>Bibliothèque</Link>
        <Link to="/community" className={isActive('/community') ? 'active' : 'link'}>Communauté</Link>
        <Link to="/create">Créer un Manga</Link>
        <Link to="/profile" className={isActive('/profile') ? 'active' : 'link'}>Profil</Link>
      </div>
    </nav>
  )
}
