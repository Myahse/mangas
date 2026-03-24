import { useState } from 'react';
import { useFetch, fetchAllManga } from '../../services/api';
import MangaCard from '../common/MangaCard';
import './LatestUpdates.css';


function CardSkeleton() {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden' }}>
      <div className="skeleton" style={{ aspectRatio: '2/3', width: '100%' }} />
      <div style={{ padding: '10px 12px' }}>
        <div className="skeleton" style={{ height: 13, borderRadius: 4, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, borderRadius: 4, width: '60%' }} />
      </div>
    </div>
  );
}

export default function LatestUpdates() {
  const [activeTab, setActiveTab] = useState('latest');
  const { data: allManga, loading } = useFetch(fetchAllManga);

  const getList = () => {
    if (!allManga) return [];
    switch (activeTab) {
      case 'trending':
        return [...allManga].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)).slice(0, 12);
      case 'new':
        return [...allManga].sort((a, b) => b.year - a.year).slice(0, 12);
      default:
        return [...allManga].sort((a, b) => b.latestChapter.number - a.latestChapter.number).slice(0, 12);
    }
  };

  const list = getList();

  return (
    <section className="latest">
      <div className="section-header">
        <h2 className="section-title">Mises à Jour</h2>

      </div>

      <div className="latest__grid">
        {loading || !allManga
          ? Array.from({ length: 12 }, (_, i) => <CardSkeleton key={i} />)
          : list.map(manga => <MangaCard key={manga.id} manga={manga} />)
        }
      </div>
    </section>
  );
}
