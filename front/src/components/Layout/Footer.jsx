import { Link } from 'react-router-dom';
import { BookOpen, Github, Twitter, Instagram, Heart } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <span>
                Mang<span className="footer__logo-accent">Afrik</span>
              </span>
            </Link>
            <p className="footer__tagline">
              Votre destination pour lire les meilleurs mangas en ligne, gratuitement et en haute qualité.
            </p>
            <div className="footer__socials">
              <a href="#" aria-label="Github" className="footer__social"><Github size={18} /></a>
              <a href="#" aria-label="Twitter" className="footer__social"><Twitter size={18} /></a>
              <a href="#" aria-label="Instagram" className="footer__social"><Instagram size={18} /></a>
            </div>
          </div>

          {/* Navigation */}
          <div className="footer__col">
            <h4 className="footer__col-title">Navigation</h4>
            <ul className="footer__links">
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/browse">Parcourir</Link></li>
              <li><Link to="/browse?sort=new">Nouveautés</Link></li>
              <li><Link to="/browse?sort=popular">Populaire</Link></li>
            </ul>
          </div>

          {/* Genres */}
          <div className="footer__col">
            <h4 className="footer__col-title">Genres</h4>
            <ul className="footer__links">
              {['Action', 'Romance', 'Fantasy', 'Horror', 'Comedy', 'Drama', 'Isekai'].map(g => (
                <li key={g}>
                  <Link to={`/browse?genre=${encodeURIComponent(g)}`}>{g}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div className="footer__col">
            <h4 className="footer__col-title">Informations</h4>
            <ul className="footer__links">
              <li><a href="#">À propos</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Politique de confidentialité</a></li>
              <li><a href="#">Conditions d&apos;utilisation</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">
            © {year} MangaAfrik. Fait avec passion pour les fans de manga.
          </p>
          <p className="footer__disclaimer">
            MangAfrik ne revendique pas la propriété des œuvres présentées. Ce site est à but éducatif uniquement.
          </p>
        </div>
      </div>
    </footer>
  );
}
