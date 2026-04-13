import { Link } from 'react-router-dom';
import { Star, BookOpen, Clock } from 'lucide-react';
import './MangaCard.css';

export default function MangaCard({ manga, variant = 'default' }) {
  if (!manga) return null;

  const statusLabel = manga.status ?? '—';
  const statusKey = (manga.status ?? 'unknown').toString().toLowerCase();
  const latest = manga.latestChapter ?? null;

  if (variant === 'list') {
    return (
      <Link to={`/manga/${manga.slug}`} className="manga-card manga-card--list">
        <img src={manga.cover} alt={manga.title} className="manga-card__thumb-sm" loading="lazy" />
        <div className="manga-card__list-info">
          <p className="manga-card__list-title">{manga.title}</p>
          <p className="manga-card__list-meta">
            {latest ? `Ch. ${latest.number} · ${latest.date}` : 'Aucun chapitre'}
          </p>
        </div>
        <div className="manga-card__list-rating rating">
          <Star size={11} fill="currentColor" />
          {manga.rating}
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/manga/${manga.slug}`} className="manga-card manga-card--default">
      {/* Thumbnail */}
      <div className="manga-card__thumb-wrap">
        <img
          src={manga.cover}
          alt={manga.title}
          className="manga-card__thumb"
          loading="lazy"
        />
        {/* Rating badge */}
        <div className="manga-card__rating">
          <Star size={11} fill="currentColor" />
          {manga.rating}
        </div>
        {/* Status badge */}
        <span className={`manga-card__status badge badge-${statusKey}`}>
          {statusLabel}
        </span>
        {/* Hover overlay */}
        <div className="manga-card__overlay">
          <div className="manga-card__overlay-content">
            <BookOpen size={20} />
            <span>Lire</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="manga-card__info">
        <h3 className="manga-card__title">{manga.title}</h3>
        <div className="manga-card__genres">
          {(manga.genres ?? []).slice(0, 2).map(g => (
            <span key={g} className="manga-card__genre">{g}</span>
          ))}
        </div>
        <div className="manga-card__latest">
          <Clock size={11} />
          <span>{latest ? `Ch. ${latest.number} · ${latest.date}` : 'Aucun chapitre'}</span>
        </div>
      </div>
    </Link>
  );
}
