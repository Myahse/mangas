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

/** Public URL to fetch an object stored under `key` (same host as API). */
export function storageObjectUrl(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  return `${apiBase()}/storage/${k}`;
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


export async function fetchPages(slug, chapterNumber, _nonce) {
  void _nonce;
  return request(
    `/manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterNumber)}/pages`,
  );
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
  return request('/creator-requests/me');
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
