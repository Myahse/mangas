import { Link } from 'react-router-dom';
import HeroBanner from '../components/home/HeroBanner';
import LatestUpdates from '../components/home/LatestUpdates';
import PopularSidebar from '../components/home/PopularSidebar';
import MangaCard from '../components/common/MangaCard';
import { useFetch, fetchPopularManga } from '../services/api';
import './HomePage.css';

export default function HomePage() {
  const { data: popular } = useFetch(fetchPopularManga, 8);

  return (
    <div className="home">
      <HeroBanner />

      <main className="home__main container">
     

        {/* Content + Sidebar */}
        <div className="home__content-row">
          <div className="home__content">
            <LatestUpdates />

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
