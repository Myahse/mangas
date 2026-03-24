import { Link } from 'react-router-dom';
import { TrendingUp, Star, Flame, Sparkles } from 'lucide-react';
import { useFetch, fetchPopularManga, fetchAllManga } from '../../services/api';
import './PopularSidebar.css';

function ItemSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px', alignItems: 'center' }}>
      <div className="skeleton" style={{ width: 22, height: 16, borderRadius: 3, flexShrink: 0 }} />
      <div className="skeleton" style={{ width: 38, height: 52, borderRadius: 5, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 12, borderRadius: 3, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 10, width: '60%', borderRadius: 3 }} />
      </div>
    </div>
  );
}

function RankedItem({ manga, rank }) {
  return (
    <Link to={`/manga/${manga.slug}`} className="sidebar-item">
      <span className={`sidebar-item__rank${rank <= 3 ? ` sidebar-item__rank--top${rank}` : ''}`}>
        {rank}
      </span>
      <img src={manga.cover} alt={manga.title} className="sidebar-item__cover" loading="lazy" />
      <div className="sidebar-item__info">
        <p className="sidebar-item__title">{manga.title}</p>
        <p className="sidebar-item__meta">{manga.author}</p>
        <div className="sidebar-item__stats">
          <span className="rating"><Star size={11} fill="currentColor" />{manga.rating}</span>
          <span className="sidebar-item__views">{manga.views}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PopularSidebar() {
  const { data: popular, loading: loadingPop } = useFetch(fetchPopularManga, 10);
  const { data: allManga, loading: loadingAll } = useFetch(fetchAllManga);

  const newManga = allManga
    ? [...allManga].sort((a, b) => b.year - a.year).slice(0, 5)
    : null;

  return (
    <aside className="sidebar">
      {/* Top Manga */}
      <section className="sidebar__section">
        <div className="sidebar__header">
          <h3 className="sidebar__title"><TrendingUp size={16} />Top Manga</h3>
        </div>
        <div className="sidebar__list">
          {loadingPop || !popular
            ? Array.from({ length: 10 }, (_, i) => <ItemSkeleton key={i} />)
            : popular.map((manga, i) => <RankedItem key={manga.id} manga={manga} rank={i + 1} />)
          }
        </div>
      </section>

      {/* New Releases */}
      <section className="sidebar__section">
        <div className="sidebar__header">
          <h3 className="sidebar__title"><Sparkles size={16} />Nouvelles Séries</h3>
        </div>
        <div className="sidebar__list">
          {loadingAll || !newManga
            ? Array.from({ length: 5 }, (_, i) => <ItemSkeleton key={i} />)
            : newManga.map(manga => (
                <Link key={manga.id} to={`/manga/${manga.slug}`} className="sidebar-new">
                  <img src={manga.cover} alt={manga.title} className="sidebar-new__cover" loading="lazy" />
                  <div className="sidebar-new__info">
                    <p className="sidebar-new__title">{manga.title}</p>
                    <div className="sidebar-new__genres">
                      {manga.genres.slice(0, 2).map(g => (
                        <span key={g} className="sidebar-new__genre">{g}</span>
                      ))}
                    </div>
                    <p className="sidebar-new__meta">{manga.totalChapters} ch.</p>
                  </div>
                </Link>
              ))
          }
        </div>
      </section>
    </aside>
  );
}
