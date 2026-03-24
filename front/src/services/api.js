/* ─────────────────────────────────────────────────────────────
   api.js  –  Couche d'accès aux données depuis /public/db.json
   Simule une vraie API REST avec délai réseau et cache mémoire.
   Quand tu auras un vrai backend, remplace DB_URL par ton endpoint.
───────────────────────────────────────────────────────────── */

const DB_URL    = '/db.json';
const FAKE_DELAY = 300; // ms — simule la latence réseau

/* ── Cache en mémoire (évite de re-fetcher à chaque navigation) ── */
let _cache = null;

async function getDB() {
  if (_cache) return _cache;
  const res = await fetch(DB_URL);
  if (!res.ok) throw new Error(`Impossible de charger db.json (${res.status})`);
  _cache = await res.json();
  return _cache;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ════════════════════════════════════════════════════════════
   MANGA — requêtes
════════════════════════════════════════════════════════════ */

/** Récupère tous les manga */
export async function fetchAllManga() {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  return db.manga;
}

/** Récupère un manga par son slug */
export async function fetchMangaBySlug(slug) {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  const manga = db.manga.find(m => m.slug === slug);
  if (!manga) throw new Error(`Manga introuvable : ${slug}`);
  return manga;
}

/** Manga mis en avant (featured: true) */
export async function fetchFeaturedManga() {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  return db.manga.filter(m => m.featured);
}

/** Dernières mises à jour — trié par numéro de chapitre desc */
export async function fetchLatestUpdated(count = 12) {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  return [...db.manga]
    .sort((a, b) => b.latestChapter.number - a.latestChapter.number)
    .slice(0, count);
}

/** Les plus populaires — trié par note desc */
export async function fetchPopularManga(count = 10) {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  return [...db.manga]
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    .slice(0, count);
}

/** Recherche par titre, auteur ou genre */
export async function fetchSearchManga({ query = '', genre = '', status = '', sort = 'popular' } = {}) {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  let list = [...db.manga];

  if (query) {
    const q = query.toLowerCase();
    list = list.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.author.toLowerCase().includes(q) ||
      m.genres.some(g => g.toLowerCase().includes(q))
    );
  }

  if (genre)  list = list.filter(m => m.genres.includes(genre));
  if (status && status !== 'Tous') list = list.filter(m => m.status === status);

  switch (sort) {
    case 'rating':  list.sort((a, b) => b.rating - a.rating);  break;
    case 'latest':  list.sort((a, b) => b.latestChapter.number - a.latestChapter.number); break;
    case 'new':     list.sort((a, b) => b.year - a.year); break;
    case 'az':      list.sort((a, b) => a.title.localeCompare(b.title)); break;
    default:        list.sort((a, b) => b.rating - a.rating); break;
  }

  return list;
}

/* ════════════════════════════════════════════════════════════
   GENRES
════════════════════════════════════════════════════════════ */

export async function fetchGenres() {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  return db.genres;
}

/* ════════════════════════════════════════════════════════════
   CHAPITRES (généré dynamiquement à partir du totalChapters)
════════════════════════════════════════════════════════════ */

export async function fetchChapters(slug) {
  const [manga] = await Promise.all([fetchMangaBySlug(slug), delay(FAKE_DELAY)]);
  const total = manga.totalChapters;
  const max   = Math.min(total, 50);
  return Array.from({ length: max }, (_, i) => {
    const num = total - max + i + 1;
    /* Si des images locales sont déclarées pour ce chapitre, on utilise
       leur nombre réel — sinon on génère une valeur par défaut. */
    const localCount = manga.localChapters?.[String(num)];
    return {
      number: num,
      title:  `Chapitre ${num}`,
      date:   num === total   ? 'Il y a 2 jours'
            : num === total-1 ? 'Il y a 1 semaine'
            : `Il y a ${(num % 28) + 1} jours`,
      pages:  localCount ?? (18 + (num % 10)),
    };
  }).reverse();
}

/**
 * Pages d'un chapitre.
 *
 * Si le manga déclare `localChapters[chapterNumber]` dans db.json,
 * les URLs pointent vers tes images locales dans :
 *   public/chapters/<slug>/<chapterNumber>/001.jpg  (ou .png, .webp…)
 *
 * Sinon, fallback sur des images picsum pour les tests.
 *
 * Format de nommage attendu : 001.jpg, 002.jpg … 999.jpg
 * Extensions supportées (dans l'ordre de priorité) : jpg, png, webp
 */
export async function fetchPages(slug, chapterNumber) {
  const [db] = await Promise.all([getDB(), delay(FAKE_DELAY)]);
  const manga = db.manga.find(m => m.slug === slug);

  const localCount = manga?.localChapters?.[String(chapterNumber)];

  if (localCount && localCount > 0) {
    /* ── Images locales ── */
    return Array.from({ length: localCount }, (_, i) => {
      const num = String(i + 1).padStart(3, '0'); // "001", "002" …
      return {
        number: i + 1,
        /* Vite sert tout le dossier /public/ à la racine du site */
        url: `/chapters/${slug}/${chapterNumber}/${num}.jpg`,
      };
    });
  }

  /* ── Fallback picsum ── */
  return Array.from({ length: 20 }, (_, i) => ({
    number: i + 1,
    url:    `https://picsum.photos/seed/${slug}-ch${chapterNumber}-p${i + 1}/800/1200`,
  }));
}

/* ════════════════════════════════════════════════════════════
   Hook utilitaire — useFetch
   Usage: const { data, loading, error } = useFetch(fetchFn, ...args)
════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from 'react';

export function useFetch(fetchFn, ...args) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* Serialize args to detect changes */
  const key = JSON.stringify(args);
  const keyRef = useRef(key);

  useEffect(() => {
    keyRef.current = key;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFn(...args)
      .then(result => {
        if (!cancelled) { setData(result); setLoading(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoading(false); }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
