import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFetch, fetchFollowedSeries } from '../../services/api';
import './ContinueReading.css';

/** "Mes abonnements": followed series with their latest chapter (same cards as "Reprendre la lecture"). */
export default function FollowedSeries() {
  const { data, loading } = useFetch(fetchFollowedSeries);
  const items = Array.isArray(data) ? data : [];

  if (loading && !data) return <div className="skeleton" style={{ height: 86, borderRadius: 10 }} />;
  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)' }}>
        Vous ne suivez aucune série. Touchez le ♥ sur la page d’une série pour être prévenu de ses nouveaux chapitres.
      </p>
    );
  }

  return (
    <div className="continue__list">
      {items.map((it) => (
        <Link
          key={it.slug}
          to={it.latestChapter ? `/manga/${it.slug}/chapter/${it.latestChapter}` : `/manga/${it.slug}`}
          className="continue__item"
        >
          <img src={it.cover} alt={it.title} className="continue__cover" loading="lazy" />
          <div className="continue__info">
            <p className="continue__title">{it.title}</p>
            <p className="continue__meta">
              {it.latestChapter ? `Dernier : chapitre ${it.latestChapter}${it.latestTitle ? ` · ${it.latestTitle}` : ''}` : 'Pas encore de chapitre'}
            </p>
          </div>
          <span className="continue__play" aria-hidden="true"><Heart size={14} fill="currentColor" /></span>
        </Link>
      ))}
    </div>
  );
}
