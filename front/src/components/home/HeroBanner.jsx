import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, BookOpen, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useFetch } from '../../services/api';
import { fetchFeaturedManga } from '../../services/api';
import './HeroBanner.css';

function HeroSkeleton() {
  return (
    <section className="hero hero--skeleton">
      <div className="hero__bg" style={{ background: '#1a1a1a' }} />
      <div className="hero__overlay-left" />
      <div className="hero__overlay-bottom" />
      <div className="hero__content container">
        <div className="hero__info">
          <div className="skeleton" style={{ width: 200, height: 22, borderRadius: 4, marginBottom: 14 }} />
          <div className="skeleton" style={{ width: '70%', height: 42, borderRadius: 6, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '50%', height: 16, borderRadius: 4, marginBottom: 14 }} />
          <div className="skeleton" style={{ width: '90%', height: 60, borderRadius: 4, marginBottom: 28 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="skeleton" style={{ width: 160, height: 44, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 140, height: 44, borderRadius: 6 }} />
          </div>
        </div>
        <div className="hero__cover-wrapper">
          <div className="skeleton" style={{ width: 200, height: 280, borderRadius: 10, transform: 'rotate(2deg)' }} />
        </div>
      </div>
    </section>
  );
}

export default function HeroBanner() {
  const { data: featured, loading } = useFetch(fetchFeaturedManga);
  const [current, setCurrent]       = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const total = featured?.length ?? 0;

  const goTo = useCallback((index) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
    }, 300);
  }, [transitioning]);

  const prev = () => goTo((current - 1 + total) % total);
  const next = useCallback(() => goTo((current + 1) % total), [current, total, goTo]);

  /* Auto-rotate every 5s */
  useEffect(() => {
    if (!total) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, total]);

  if (loading) return <HeroSkeleton />;
  if (!featured || featured.length === 0) {
    return (
      <section className="hero hero--skeleton" aria-label="Aucun manga en vedette">
        <div className="hero__bg" style={{ background: '#1a1a1a' }} />
        <div className="hero__overlay-left" />
        <div className="hero__overlay-bottom" />
        <div className="hero__content container">
          <div className="hero__info">
            <h2 style={{ margin: 0 }}>Aucun manga en vedette</h2>
            <p style={{ marginTop: 10, opacity: 0.8 }}>
              Le catalogue est vide pour le moment. Ajoutez des titres côté backend puis rafraîchissez.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const manga = featured[current] || featured[0];

  return (
    <section className="hero">
      {/* Background image */}
      <div
        className={`hero__bg${transitioning ? ' hero__bg--fade' : ''}`}
        style={{ backgroundImage: manga?.banner ? `url(${manga.banner})` : 'none' }}
      />
      <div className="hero__overlay-left" />
      <div className="hero__overlay-bottom" />

      <div className="hero__content container">
        {/* Info */}
        <div className="hero__info">
          <div className="hero__badges">
            <span className={`badge badge-${(manga.status || 'unknown').toLowerCase()}`}>{manga.status || 'Unknown'}</span>
            {(manga.genres || []).slice(0, 3).map(g => (
              <span key={g} className="hero__genre-tag">{g}</span>
            ))}
          </div>

          <h1 className="hero__title">{manga.title}</h1>

          <div className="hero__meta">
            <span className="rating">
              <Star size={14} fill="currentColor" />
              {manga.rating}
            </span>
            <span className="hero__meta-dot">·</span>
            <span className="hero__meta-text">{manga.author || '—'}</span>
            <span className="hero__meta-dot">·</span>
            <span className="hero__meta-text">{manga.totalChapters} chapitres</span>
            <span className="hero__meta-dot">·</span>
            <span className="hero__meta-text">{manga.views} vues</span>
          </div>

          <p className="hero__synopsis">{manga.synopsis || ''}</p>

          <div className="hero__buttons">
            <Link to={`/manga/${manga.slug}/chapter/1`} className="hero__btn hero__btn--primary">
              <Play size={16} fill="currentColor" />
              Lire maintenant
            </Link>
            <Link to={`/manga/${manga.slug}`} className="hero__btn hero__btn--secondary">
              <BookOpen size={16} />
              Voir les détails
            </Link>
          </div>
        </div>

        {/* Main character / cover */}
        <div className="hero__cover-wrapper">
          <img
            key={manga.id}
            /* Si un visuel de personnage principal est défini,
               on l'utilise, sinon on retombe sur la cover du manga */
            src={manga.heroCover || manga.cover || ''}
            alt={manga.title}
            className={`hero__cover${transitioning ? ' hero__cover--fade' : ''}`}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="hero__controls">
        <button className="hero__arrow hero__arrow--left" onClick={prev} aria-label="Précédent">
          <ChevronLeft size={20} />
        </button>
        <div className="hero__dots">
          {featured.map((_, i) => (
            <button
              key={i}
              className={`hero__dot${i === current ? ' hero__dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button className="hero__arrow hero__arrow--right" onClick={next} aria-label="Suivant">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="hero__progress" key={current}>
        <div className="hero__progress-bar" />
      </div>
    </section>
  );
}
