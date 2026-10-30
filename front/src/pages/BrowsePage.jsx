import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, BookOpen } from 'lucide-react';
import { useFetch, fetchAllManga, fetchGenres, searchManga } from '../services/api';
import MangaCard from '../components/common/MangaCard';
import './BrowsePage.css';

const SORT_OPTIONS = [
  { label: 'Pertinence',    value: 'relevance' }, // only while searching
  { label: 'Popularité',    value: 'popular' },
  { label: 'Note',          value: 'rating'  },
  { label: 'Dernières MAJ', value: 'latest'  },
  { label: 'Plus récents',  value: 'new'     },
  { label: 'A → Z',         value: 'az'      },
];

const STATUS_OPTIONS = ['Tous', 'Ongoing', 'Completed', 'Hiatus'];

function CardSkeleton() {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div className="skeleton" style={{ aspectRatio: '2/3', width: '100%' }} />
      <div style={{ padding: '10px 12px 12px' }}>
        <div className="skeleton" style={{ height: 14, borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query,          setQuery]          = useState(searchParams.get('q')     || '');
  const [sort,           setSort]           = useState(searchParams.get('sort')  || (searchParams.get('q') ? 'relevance' : 'popular'));
  const [status,         setStatus]         = useState('Tous');
  const [selectedGenres, setSelectedGenres] = useState(
    searchParams.get('genre') ? [searchParams.get('genre')] : []
  );
  const [showFilters, setShowFilters] = useState(false);

  const { data: allManga, loading } = useFetch(fetchAllManga);
  // Search runs on the server (accents and a typo forgiven), 250 ms after the last keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);
  const { data: searchResults, loading: searching } = useFetch(
    (q) => (q ? searchManga(q, 50) : Promise.resolve(null)),
    debouncedQuery,
  );
  const { data: genres }            = useFetch(fetchGenres);

  const toggleGenre = (g) =>
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val && !query) setSort('relevance');
    if (!val && sort === 'relevance') setSort('popular');
    const params = new URLSearchParams(searchParams);
    if (val) params.set('q', val); else params.delete('q');
    setSearchParams(params);
  };

  const filtered = useMemo(() => {
    const base = debouncedQuery ? searchResults : allManga;
    if (!base) return [];
    let list = [...base];

    if (status !== 'Tous')        list = list.filter(m => m.status === status);
    if (selectedGenres.length > 0) list = list.filter(m => selectedGenres.every(g => m.genres.includes(g)));

    switch (sort) {
      case 'rating':  list.sort((a, b) => b.rating - a.rating); break;
      case 'latest':  list.sort((a, b) => b.latestChapter.number - a.latestChapter.number); break;
      case 'new':     list.sort((a, b) => b.year - a.year); break;
      case 'az':      list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'relevance': if (!debouncedQuery) list.sort((a, b) => b.rating - a.rating); break; // server order
      default:        list.sort((a, b) => b.rating - a.rating); break;
    }
    return list;
  }, [allManga, searchResults, debouncedQuery, sort, status, selectedGenres]);

  return (
    <div className="page-wrapper browse-page">
      <div className="container">
        {/* Header */}
        <div className="browse__header">
          <div>
            <h1 className="browse__title">Explorer les Mangas</h1>
            <p className="browse__subtitle">
              {loading || (debouncedQuery && searching) ? 'Chargement…' : `${filtered.length} manga${filtered.length !== 1 ? 's' : ''} trouvé${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            className={`browse__filter-toggle${showFilters ? ' browse__filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(s => !s)}
          >
            <SlidersHorizontal size={16} />Filtres
          </button>
        </div>

        {/* Search + Sort */}
        <div className="browse__controls">
          <div className="browse__search">
            <Search size={16} className="browse__search-icon" />
            <input
              type="text"
              placeholder="Rechercher un manga, un auteur…"
              value={query}
              onChange={handleSearch}
              className="browse__search-input"
            />
            {query && (
              <button className="browse__search-clear" onClick={() => { setQuery(''); setSearchParams({}); }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="browse__sort">
            {SORT_OPTIONS.filter(opt => opt.value !== 'relevance' || query.trim()).map(opt => (
              <button
                key={opt.value}
                className={`browse__sort-btn${sort === opt.value ? ' browse__sort-btn--active' : ''}`}
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="browse__filters">
            <div className="browse__filter-group">
              <p className="browse__filter-label">Statut</p>
              <div className="browse__filter-chips">
                {STATUS_OPTIONS.map(s => (
                  <button key={s} className={`browse__chip${status === s ? ' browse__chip--active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="browse__filter-group">
              <p className="browse__filter-label">
                Genres
                {selectedGenres.length > 0 && (
                  <button className="browse__clear-genres" onClick={() => setSelectedGenres([])}>Effacer</button>
                )}
              </p>
              <div className="browse__filter-chips">
                {(genres ?? []).map(g => (
                  <button key={g} className={`browse__chip${selectedGenres.includes(g) ? ' browse__chip--active' : ''}`} onClick={() => toggleGenre(g)}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active genre tags */}
        {selectedGenres.length > 0 && (
          <div className="browse__active-filters">
            {selectedGenres.map(g => (
              <button key={g} className="browse__active-chip" onClick={() => toggleGenre(g)}>
                {g} <X size={12} />
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading || (debouncedQuery && searching && !searchResults) ? (
          <div className="browse__grid">
            {Array.from({ length: 16 }, (_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="browse__grid">
            {filtered.map(m => <MangaCard key={m.id} manga={m} />)}
          </div>
        ) : (
          <div className="browse__empty">
            <BookOpen size={64} strokeWidth={1.5} />
            <h3>Aucun manga trouvé</h3>
            <p>Essayez d&apos;autres mots-clés ou filtres</p>
            <button
              className="browse__empty-reset"
              onClick={() => { setQuery(''); setSelectedGenres([]); setStatus('Tous'); setSearchParams({}); }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
