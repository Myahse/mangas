import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Star, BookOpen, Heart, Share2, ChevronRight,
  User, Tag, Clock, TrendingUp, List, Grid,
} from 'lucide-react';
import { useFetch, fetchMangaBySlug, fetchChapters, fetchPopularManga } from '../services/api';
import MangaCard from '../components/common/MangaCard';
import './MangaPage.css';

/* ── Squelettes de chargement ── */
function HeaderSkeleton() {
  return (
    <div className="manga-page__header">
      <div className="manga-page__cover-wrap">
        <div className="skeleton" style={{ width: 200, height: 280, borderRadius: 10 }} />
      </div>
      <div className="manga-page__meta" style={{ paddingTop: 100 }}>
        <div className="skeleton" style={{ width: 200, height: 14, borderRadius: 4, marginBottom: 14 }} />
        <div className="skeleton" style={{ width: '60%', height: 36, borderRadius: 6, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '80%', height: 12, borderRadius: 4, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '90%', height: 64, borderRadius: 4, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="skeleton" style={{ width: 140, height: 44, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 130, height: 44, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export default function MangaPage() {
  const { slug } = useParams();
  const [bookmarked, setBookmarked] = useState(false);
  const [chapterView,   setChapterView]   = useState('list');
  const [chapterSearch, setChapterSearch] = useState('');

  const { data: manga,    loading: loadingManga,    error: errorManga }    = useFetch(fetchMangaBySlug, slug);
  const { data: chapters, loading: loadingChapters }                        = useFetch(fetchChapters,   slug);
  const { data: related,  loading: loadingRelated }                         = useFetch(fetchPopularManga, 6);

  /* ── Erreur / 404 ── */
  if (errorManga) {
    return (
      <div className="page-wrapper manga-notfound">
        <div className="container">
          <h2>Manga introuvable</h2>
          <Link to="/" className="manga-notfound__back">← Retour à l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  const filteredChapters = (chapters ?? []).filter(ch =>
    !chapterSearch ||
    ch.number.toString().includes(chapterSearch) ||
    ch.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  const relatedFiltered = (related ?? []).filter(m => m.slug !== slug).slice(0, 6);

  return (
    <div className="page-wrapper manga-page">
      {/* Banner */}
      {manga && (
        <div
          className="manga-page__banner"
          style={{ backgroundImage: `url(${manga.banner})` }}
        >
          <div className="manga-page__banner-overlay" />
        </div>
      )}

      <div className="container">
        {/* Header */}
        {loadingManga || !manga ? <HeaderSkeleton /> : (
          <div className="manga-page__header">
            <div className="manga-page__cover-wrap">
              <img src={manga.cover} alt={manga.title} className="manga-page__cover" />
            </div>

            <div className="manga-page__meta">
              {/* Breadcrumb */}
              <div className="manga-page__breadcrumb">
                <Link to="/">Accueil</Link>
                <ChevronRight size={14} />
                <Link to="/browse">Manga</Link>
                <ChevronRight size={14} />
                <span>{manga.title}</span>
              </div>

              <h1 className="manga-page__title">{manga.title}</h1>

              <div className="manga-page__info-row">
                <div className="manga-page__info-item"><User size={14} /><span>{manga.author}</span></div>
                <div className="manga-page__info-item"><Clock size={14} /><span>Ch. {manga.latestChapter.number} · {manga.latestChapter.date}</span></div>
                <div className="manga-page__info-item"><TrendingUp size={14} /><span>{manga.views} vues</span></div>
              </div>

              <div className="manga-page__genres">
                {manga.genres.map(g => (
                  <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="manga-page__genre-tag">
                    <Tag size={11} />{g}
                  </Link>
                ))}
              </div>

              <div className="manga-page__stats">
                <div className="manga-page__stat">
                  <span className="manga-page__stat-value rating"><Star size={16} fill="currentColor" />{manga.rating}</span>
                  <span className="manga-page__stat-label">Note</span>
                </div>
                <div className="manga-page__stat-divider" />
                <div className="manga-page__stat">
                  <span className="manga-page__stat-value">{manga.totalChapters}</span>
                  <span className="manga-page__stat-label">Chapitres</span>
                </div>
                <div className="manga-page__stat-divider" />
                <div className="manga-page__stat">
                  <span className={`badge badge-${manga.status.toLowerCase()}`}>{manga.status}</span>
                  <span className="manga-page__stat-label">Statut</span>
                </div>
                <div className="manga-page__stat-divider" />
                <div className="manga-page__stat">
                  <span className="manga-page__stat-value">{manga.year}</span>
                  <span className="manga-page__stat-label">Année</span>
                </div>
              </div>

              <p className="manga-page__synopsis">{manga.synopsis}</p>

              <div className="manga-page__actions">
                <Link to={`/manga/${manga.slug}/chapter/1`} className="manga-page__btn manga-page__btn--primary">
                  <BookOpen size={16} />Lire le Ch.1
                </Link>
                <Link to={`/manga/${manga.slug}/chapter/${manga.totalChapters}`} className="manga-page__btn manga-page__btn--outline">
                  Dernier chapitre
                </Link>
                <button
                  className={`manga-page__btn manga-page__btn--icon${bookmarked ? ' manga-page__btn--bookmarked' : ''}`}
                  onClick={() => setBookmarked(s => !s)}
                  aria-label="Favoris"
                >
                  <Heart size={18} fill={bookmarked ? 'currentColor' : 'none'} />
                </button>
                <button className="manga-page__btn manga-page__btn--icon" aria-label="Partager">
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chapters */}
        <section className="manga-page__chapters">
          <div className="manga-page__chapters-header">
            <h2 className="section-title">
              Chapitres {manga ? `(${manga.totalChapters})` : ''}
            </h2>
            <div className="manga-page__chapters-controls">
              <input
                type="text"
                placeholder="Chercher chapitre…"
                value={chapterSearch}
                onChange={e => setChapterSearch(e.target.value)}
                className="manga-page__chapters-search"
              />
              <div className="manga-page__view-toggle">
                <button className={`manga-page__view-btn${chapterView === 'list' ? ' active' : ''}`} onClick={() => setChapterView('list')}><List size={16} /></button>
            
              </div>
            </div>
          </div>

          <div className={`manga-page__chapter-list manga-page__chapter-list--${chapterView}`}>
            {loadingChapters || !chapters
              ? Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />
                ))
              : filteredChapters.map(ch => (
                  <Link key={ch.number} to={`/manga/${slug}/chapter/${ch.number}`} className="chapter-item">
                    <span className="chapter-item__num">Ch. {ch.number}</span>
                    <span className="chapter-item__title">{ch.title}</span>
                    <span className="chapter-item__date">{ch.date}</span>
                    <span className="chapter-item__pages">{ch.pages} pages</span>
                  </Link>
                ))
            }
          </div>
        </section>

        {/* Related */}
        <section className="manga-page__related">
          <div className="section-header">
            <h2 className="section-title">Vous pourriez aussi aimer</h2>
            <Link to="/browse" className="see-all-btn">Voir tout</Link>
          </div>
          <div className="manga-page__related-grid">
            {loadingRelated || !related
              ? Array.from({ length: 6 }, (_, i) => (
                  <div key={i} style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <div className="skeleton" style={{ aspectRatio: '2/3', width: '100%' }} />
                    <div style={{ padding: '10px 12px' }}>
                      <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
                    </div>
                  </div>
                ))
              : relatedFiltered.map(m => <MangaCard key={m.id} manga={m} />)
            }
          </div>
        </section>
      </div>
    </div>
  );
}
