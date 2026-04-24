/* ─────────────────────────────────────────────────────────────
   api.js – Frontend API client (real backend).
   Backend routes live under: /api/v1
───────────────────────────────────────────────────────────── */

const DEFAULT_BASE =
  import.meta?.env?.VITE_API_BASE_URL_DEFAULT || 'http://localhost:8082/api/v1';

function apiBase() {
  return (import.meta?.env?.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const base = apiBase();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : null),
      ...(headers || null),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

/* ════════════════════════════════════════════════════════════
   MANGA — requêtes
════════════════════════════════════════════════════════════ */

/** Récupère tous les manga */
export async function fetchAllManga() {
  return request('/manga');
}

/** Récupère un manga par son slug */
export async function fetchMangaBySlug(slug) {
  return request(`/manga/${encodeURIComponent(slug)}`);
}

/** Manga mis en avant (featured: true) */
export async function fetchFeaturedManga() {
  return request('/manga/featured');
}

/** Dernières mises à jour — trié par numéro de chapitre desc */
export async function fetchLatestUpdated(count = 12) {
  return request(`/manga/latest?count=${encodeURIComponent(count)}`);
}

/** Les plus populaires — trié par note desc */
export async function fetchPopularManga(count = 10) {
  return request(`/manga/popular?count=${encodeURIComponent(count)}`);
}

/** Recherche par titre, auteur ou genre */
export async function fetchSearchManga({ query = '', genre = '', status = '', sort = 'popular' } = {}) {
  // Backend doesn't expose a dedicated search endpoint yet,
  // so we filter client-side.
  let list = await fetchAllManga();

  if (query) {
    const q = query.toLowerCase();
    list = list.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.author || '').toLowerCase().includes(q) ||
      (m.genres || []).some(g => g.toLowerCase().includes(q))
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
  return request('/genres');
}

/* ════════════════════════════════════════════════════════════
   CHAPITRES (généré dynamiquement à partir du totalChapters)
════════════════════════════════════════════════════════════ */

export async function fetchChapters(slug) {
  return request(`/manga/${encodeURIComponent(slug)}/chapters`);
}

/**
 * Pages d'un chapitre.
 *
 * Le backend renvoie déjà les URLs (locales ou fallback picsum).
 */
export async function fetchPages(slug, chapterNumber) {
  return request(
    `/manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterNumber)}/pages`,
  );
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
