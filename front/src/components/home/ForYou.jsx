import { useFetch, fetchRecommendations } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import MangaCard from '../common/MangaCard';

// Refetches when the reader signs in or out.
const load = (authed) => (authed ? fetchRecommendations(8).catch(() => []) : Promise.resolve([]));

/** "Pour vous": suggestions from the genres of what the reader reads or follows (signed in only). */
export default function ForYou() {
  const { isAuthenticated } = useAuth();
  const { data } = useFetch(load, isAuthenticated);
  const items = Array.isArray(data) ? data : [];
  if (!isAuthenticated || items.length === 0) return null;

  return (
    <section className="home__popular">
      <div className="section-header">
        <h2 className="section-title">Pour vous</h2>
      </div>
      <div className="home__popular-grid">
        {items.map((m) => <MangaCard key={m.id} manga={m} />)}
      </div>
    </section>
  );
}
