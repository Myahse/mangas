import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useFetch, fetchReadingProgress } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ContinueReading.css';

// Refetches when the reader signs in or out (isAuthenticated is part of the useFetch key).
const loadProgress = (limit, authed) => (authed ? fetchReadingProgress(limit) : Promise.resolve([]));

function ItemSkeleton() {
  return (
    <div className="continue__item">
      <div className="skeleton continue__cover" />
      <div className="continue__info">
        <div className="skeleton" style={{ height: 13, borderRadius: 4, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, borderRadius: 4, width: '60%' }} />
      </div>
    </div>
  );
}

function ContinueItem({ item }) {
  const resumingSameChapter = item.resumeChapter === item.chapterNumber;
  const percent = resumingSameChapter && item.pageCount > 0
    ? Math.round(((item.page + 1) / item.pageCount) * 100)
    : 0;
  const query = item.resumePage > 0 ? `?page=${item.resumePage + 1}` : '';

  return (
    <Link to={`/manga/${item.slug}/chapter/${item.resumeChapter}${query}`} className="continue__item">
      <img src={item.cover} alt={item.title} className="continue__cover" loading="lazy" />
      <div className="continue__info">
        <p className="continue__title">{item.title}</p>
        <p className="continue__meta">
          {resumingSameChapter
            ? `Chapitre ${item.chapterNumber} · page ${item.page + 1}/${item.pageCount || '?'}`
            : `Chapitre ${item.chapterNumber} terminé · suite : chapitre ${item.resumeChapter}`}
        </p>
        <div className="continue__bar" aria-hidden="true">
          <div className="continue__bar-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className="continue__play" aria-hidden="true"><Play size={14} fill="currentColor" /></span>
    </Link>
  );
}

/** "Reprendre la lecture": the reader's unfinished series, most recent first. Hidden when empty. */
export default function ContinueReading() {
  const { isAuthenticated } = useAuth();
  const { data, loading } = useFetch(loadProgress, 8, isAuthenticated);
  const items = (Array.isArray(data) ? data : []).filter((it) => !it.caughtUp).slice(0, 6);

  if (!isAuthenticated || (!loading && items.length === 0)) return null;

  return (
    <section className="continue">
      <div className="section-header">
        <h2 className="section-title">Reprendre la lecture</h2>
      </div>
      <div className="continue__list">
        {loading && !data
          ? Array.from({ length: 3 }, (_, i) => <ItemSkeleton key={i} />)
          : items.map((it) => <ContinueItem key={it.slug} item={it} />)}
      </div>
    </section>
  );
}
