function requiredApiBaseUrl() {
  const env = import.meta.env;
  const primary = String(env.VITE_API_BASE_URL ?? '').trim();
  const fallback = String(env.VITE_API_BASE_URL_DEFAULT ?? '').trim();
  const v = primary || fallback;
  if (!v || v === 'undefined' || v === 'null') {
    throw new Error('Missing VITE_API_BASE_URL (set it in your build environment as VITE_API_BASE_URL)');
  }
  return v;
}

function requiredSessionStorageKey() {
  const v = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  if (!v || v === 'undefined' || v === 'null') {
    throw new Error('Missing VITE_SESSION_STORAGE_KEY (set it in your build environment as VITE_SESSION_STORAGE_KEY)');
  }
  return v;
}

function apiBase() {
  return requiredApiBaseUrl().replace(/\/$/, '');
}

/** Absolute API URL for a path like "/manga/x" (the exact URL request() fetches). */
export function apiUrl(path) {
  return `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Bearer header for the signed-in reader, or {} when signed out. */
export function authHeader() {
  try {
    const raw = localStorage.getItem(requiredSessionStorageKey());
    const token = raw ? (JSON.parse(raw)?.token || '') : '';
    return String(token).trim() ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Public URL to fetch an object stored under `key` (same host as API). */
export function storageObjectUrl(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  return `${apiBase()}/storage/${k}`;
}

/** Resolve API-relative storage paths for `<img src>` on the Vite dev host. */
export function apiAssetUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^(https?:|blob:|data:)/i.test(u)) return u;
  const base = apiBase();
  const origin = base.replace(/\/api\/v1\/?$/i, '');
  if (u.startsWith('/')) return `${origin}${u}`;
  return `${base.replace(/\/$/, '')}/${u.replace(/^\//, '')}`;
}

function normalizeManga(m) {
  if (!m) return m;
  return {
    ...m,
    cover: apiAssetUrl(m.cover),
    banner: apiAssetUrl(m.banner),
    heroCover: apiAssetUrl(m.heroCover),
  };
}

async function postMultipart(path, formData) {
  const url = `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  let token = '';
  try {
    const key = requiredSessionStorageKey();
    const raw = localStorage.getItem(key);
    token = raw ? (JSON.parse(raw)?.token || '') : '';
  } catch {}

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : null),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text || `Request failed (${res.status})`;
    try {
      const maybeJson = text ? JSON.parse(text) : null;
      message = maybeJson?.error || maybeJson?.message || message;
    } catch {}
    throw new Error(String(message));
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

async function request(path, { method = 'GET', body, headers, auth = true } = {}) {
  const url = `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  let token = '';
  try {
    const key = requiredSessionStorageKey();
    const raw = localStorage.getItem(key);
    token = raw ? (JSON.parse(raw)?.token || '') : '';
  } catch {}

  const sendAuth = auth && String(token || '').trim();

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : null),
      ...(sendAuth ? { Authorization: `Bearer ${token}` } : null),
      ...(headers || null),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text || `Request failed (${res.status})`;
    try {
      const maybeJson = text ? JSON.parse(text) : null;
      message = maybeJson?.error || maybeJson?.message || message;
    } catch {}
    throw new Error(String(message));
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
  const list = await request('/manga', { auth: false });
  return Array.isArray(list) ? list.map(normalizeManga) : list;
}

/** Récupère un manga par son slug */
export async function fetchMangaBySlug(slug) {
  const m = await request(`/manga/${encodeURIComponent(slug)}`, { auth: false });
  return normalizeManga(m);
}

/** Manga mis en avant (featured: true) */
export async function fetchFeaturedManga() {
  const list = await request('/manga/featured', { auth: false });
  return Array.isArray(list) ? list.map(normalizeManga) : list;
}

/** Dernières mises à jour — trié par numéro de chapitre desc */
export async function fetchLatestUpdated(count = 12) {
  const list = await request(`/manga/latest?count=${encodeURIComponent(count)}`, { auth: false });
  return Array.isArray(list) ? list.map(normalizeManga) : list;
}

/** Les plus populaires — trié par note desc */
export async function fetchPopularManga(count = 10) {
  const list = await request(`/manga/popular?count=${encodeURIComponent(count)}`, { auth: false });
  return Array.isArray(list) ? list.map(normalizeManga) : list;
}

/** Recherche par titre, auteur ou genre */
export async function fetchSearchManga({ query = '', genre = '', status = '', sort = 'popular' } = {}) {

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
  return request('/genres', { auth: false });
}

/* ════════════════════════════════════════════════════════════
   CHAPITRES (généré dynamiquement à partir du totalChapters)
════════════════════════════════════════════════════════════ */

export async function fetchChapters(slug) {
  return request(`/manga/${encodeURIComponent(slug)}/chapters`, { auth: false });
}


export async function fetchPages(slug, chapterNumber, _nonce) {
  void _nonce;
  const pages = await request(
    `/manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterNumber)}/pages`,
  );
  return Array.isArray(pages)
    ? pages.map((p) => ({ ...p, url: apiAssetUrl(p.url) }))
    : pages;
}

/** Record one view when a logged-in reader opens a chapter (ignored for the série owner). */
export async function recordChapterView(slug, chapterNumber) {
  try {
    await request(
      `/manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterNumber)}/view`,
      { method: 'POST' },
    );
  } catch {
    // Non-blocking: stats must not break reading.
  }
}

/* ════════════════════════════════════════════════════════════
   READING PROGRESS ("Reprendre la lecture")
════════════════════════════════════════════════════════════ */

export async function fetchReadingProgress(limit = 8) {
  const items = await request(`/reading-progress?limit=${encodeURIComponent(limit)}`);
  return Array.isArray(items) ? items.map((it) => ({ ...it, cover: apiAssetUrl(it.cover) })) : items;
}

/** page is 0-based. Non-blocking: a failed save must not interrupt reading. */
export async function saveReadingProgress(slug, chapterNumber, page, pageCount) {
  try {
    await request(`/reading-progress/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: { chapterNumber, page, pageCount },
    });
  } catch {
    // ignore
  }
}

/* ─── Data saver ("Économie de données") ─── */
const DATA_SAVER_KEY = 'mangafric.dataSaver';

/** Saved choice, else on when the device asks to save data or the connection is slow. */
export function getDataSaver() {
  try {
    const saved = localStorage.getItem(DATA_SAVER_KEY);
    if (saved === 'on') return true;
    if (saved === 'off') return false;
  } catch {}
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(c && (c.saveData || ['slow-2g', '2g', '3g'].includes(c.effectiveType)));
}

export function setDataSaver(on) {
  try { localStorage.setItem(DATA_SAVER_KEY, on ? 'on' : 'off'); } catch {}
}

/** Page image URL; with data saver, our storage serves a lighter copy (?lite=1). */
export function pageImageUrl(url, lite) {
  if (!lite || !url || !url.includes('/storage/')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}lite=1`;
}

/** Warm the browser cache with a chapter's pages so "Chapitre suivant" opens instantly. */
export async function prefetchChapterPages(slug, chapterNumber, count = 4, lite = false) {
  try {
    const pages = await fetchPages(slug, chapterNumber);
    if (!Array.isArray(pages)) return;
    pages.slice(0, count).forEach((p) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = pageImageUrl(p.url, lite);
    });
  } catch {
    // Locked or not logged in: nothing to prefetch.
  }
}

/* ════════════════════════════════════════════════════════════
   COINS / WALLET
════════════════════════════════════════════════════════════ */

export async function fetchWallet() {
  return request('/wallet');
}

export async function dailyClaimCoins() {
  return request('/wallet/daily-claim', { method: 'POST' });
}

export async function fetchDailyClaimStatus() {
  return request('/wallet/daily-claim/status');
}

export async function fetchReferralInfo() {
  return request('/wallet/referral');
}

export async function fetchPendingReferralRewards() {
  return request('/wallet/referral/pending');
}

export async function claimPendingReferralReward(id) {
  return request(`/wallet/referral/pending/${encodeURIComponent(id)}/claim`, { method: 'POST' });
}

export async function unlockManga(mangaSlug) {
  return request('/unlocks/manga', { method: 'POST', body: { mangaSlug } });
}

export async function unlockChapter(mangaSlug, chapterNumber) {
  return request('/unlocks/chapter', { method: 'POST', body: { mangaSlug, chapterNumber } });
}

/* ════════════════════════════════════════════════════════════
   STORE (coins)
════════════════════════════════════════════════════════════ */

export async function fetchCoinPacks() {
  return request('/store/coin-packs');
}

export async function createCoinPurchaseIntent(packId) {
  return request('/store/coin-purchase-intents', { method: 'POST', body: { packId } });
}

export async function fetchCoinPurchaseIntent(id) {
  return request(`/store/coin-purchase-intents/${encodeURIComponent(id)}`);
}

/* ════════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════════ */

export async function registerUser(payload) {
  return request('/auth/register', { method: 'POST', body: payload, auth: false });
}

export async function loginUser(payload) {
  return request('/auth/login', { method: 'POST', body: payload, auth: false });
}

export async function changePassword(payload) {
  return request('/auth/change-password', { method: 'POST', body: payload, auth: false });
}

export async function forgotPassword(payload) {
  return request('/auth/forgot-password', { method: 'POST', body: payload, auth: false });
}

export async function resetPassword(payload) {
  return request('/auth/reset-password', { method: 'POST', body: payload, auth: false });
}

export async function submitCreatorRequest(payload) {
  return request('/creator-requests', { method: 'POST', body: payload });
}

export async function getMyCreatorRequest() {
  const url = `${apiBase()}/creator-requests/me`;
  let token = '';
  try {
    const key = requiredSessionStorageKey();
    const raw = localStorage.getItem(key);
    token = raw ? (JSON.parse(raw)?.token || '') : '';
  } catch {}

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : null),
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text || `Request failed (${res.status})`;
    try {
      const maybeJson = text ? JSON.parse(text) : null;
      message = maybeJson?.error || maybeJson?.message || message;
    } catch {}
    throw new Error(String(message));
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  const data = await res.json();
  return data ?? null;
}

export async function getMyCreatorContract() {
  return request('/creator-requests/me/contract');
}

export async function getCreatorContractByToken(token) {
  return request(`/creator-contracts/${encodeURIComponent(token)}`);
}

export async function signCreatorContract(token, payload) {
  return request(`/creator-contracts/${encodeURIComponent(token)}/sign`, { method: 'POST', body: payload });
}

/* ════════════════════════════════════════════════════════════
   SUPPORT (public)
════════════════════════════════════════════════════════════ */

export async function createSupportTicket(payload) {
  return request('/support/public/tickets', { method: 'POST', body: payload });
}

export async function fetchSupportTicket(ticketId) {
  const id = String(ticketId || '').trim();
  if (!id) throw new Error('Missing ticket reference');
  return request(`/support/public/tickets/${encodeURIComponent(id)}`);
}

export async function fetchSupportTicketMessages(ticketId, _nonce) {
  void _nonce;
  const id = String(ticketId || '').trim();
  if (!id) throw new Error('Missing ticket reference');
  return request(`/support/public/tickets/${encodeURIComponent(id)}/messages`);
}

export async function sendSupportTicketMessage(ticketId, payload) {
  const id = String(ticketId || '').trim();
  if (!id) throw new Error('Missing ticket reference');
  return request(`/support/public/tickets/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: payload,
  });
}

/** Upload a file for a ticket (anonymous). Returns { key, url, fileName, contentType, size }. */
export async function uploadSupportPublicAttachment(ticketId, file) {
  const id = String(ticketId || '').trim();
  if (!id) throw new Error('Missing ticket reference');
  if (!file) throw new Error('Missing file');
  const fd = new FormData();
  fd.append('file', file);
  return postMultipart(`/support/public/tickets/${encodeURIComponent(id)}/attachments`, fd);
}


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
