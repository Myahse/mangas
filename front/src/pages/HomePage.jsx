import { Link } from 'react-router-dom';
import HeroBanner from '../components/home/HeroBanner';
import LatestUpdates from '../components/home/LatestUpdates';
import PopularSidebar from '../components/home/PopularSidebar';
import MangaCard from '../components/common/MangaCard';
import { useFetch, fetchPopularManga } from '../services/api';
import { incrementPublishedEpisodeView, loadPublishedEpisodes } from '../services/publications';
import './HomePage.css';

export default function HomePage() {
  const { data: popular } = useFetch(fetchPopularManga, 8);
  const published = loadPublishedEpisodes().slice(0, 3);

  return (
    <div className="home">
      <HeroBanner />

      <main className="home__main container">
     

        {/* Content + Sidebar */}
        <div className="home__content-row">
          <div className="home__content">
            <LatestUpdates />

            {published.length > 0 && (
              <section className="home__popular" style={{ marginTop: 24 }}>
                <div className="section-header">
                  <h2 className="section-title">Dernières publications</h2>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {published.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => incrementPublishedEpisodeView(p.id)}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        borderRadius: 12,
                        border: '1px solid var(--panel-border)',
                        background: 'var(--panel-bg)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 900, color: 'var(--text-dark)' }}>{p.seriesTitle}</div>
                      <div style={{ fontWeight: 900, color: 'var(--primary)', marginTop: 2 }}>{p.episodeTitle}</div>
                      <div style={{ marginTop: 6, color: 'var(--text-muted)', fontWeight: 650 }}>
                        Vues: {p.stats?.views ?? 0} · Likes: {p.stats?.likes ?? 0} · Commentaires: {p.stats?.comments ?? (p.comments?.length ?? 0)}
                      </div>
                      <div style={{ marginTop: 6, color: 'var(--text-muted)', fontWeight: 650, fontSize: '0.85rem' }}>
                        (Cliquez pour simuler une vue)
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Popular */}
            <section className="home__popular">
              <div className="section-header">
                <h2 className="section-title">Les Plus Populaires</h2>
                <Link to="/browse?sort=popular" className="see-all-btn">Voir tout</Link>
              </div>
              <div className="home__popular-grid">
                {(popular ?? []).map(m => (
                  <MangaCard key={m.id} manga={m} />
                ))}
              </div>
            </section>
          </div>

          <PopularSidebar />
        </div>
      </main>
    </div>
  );
}
