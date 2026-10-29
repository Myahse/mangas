/* Chapters downloaded for offline reading.
 *
 * A download saves, in the "mangafric-offline-v1" cache, the exact API responses the reader page
 * fetches (series, chapter list, chapter pages) and every page image. public/sw.js serves them back
 * when the network is unavailable. The list of downloads is kept in localStorage.
 */
import { apiAssetUrl, apiUrl, authHeader, pageImageUrl } from './api';

const CACHE = 'mangafric-offline-v1';
const INDEX_KEY = 'mangafric.downloads';
const CHANGED = 'mangafric:downloads-changed';

export const offlineSupported = typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator;

function readIndex() {
  try {
    const list = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeIndex(list) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(list)); } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

/** Most recent first. */
export function listDownloads() {
  return readIndex().sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

export function isDownloaded(slug, chapter) {
  return readIndex().some((d) => d.slug === slug && d.chapter === chapter);
}

export function onDownloadsChanged(cb) {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
}

const seriesPath = (slug) => `/manga/${encodeURIComponent(slug)}`;
const chaptersPath = (slug) => `/manga/${encodeURIComponent(slug)}/chapters`;
const pagesPath = (slug, n) => `/manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(n)}/pages`;

async function saveJson(cache, path, withAuth) {
  const url = apiUrl(path);
  const res = await fetch(url, { headers: withAuth ? authHeader() : {} });
  if (!res.ok) throw new Error(res.status === 403 ? 'Chapitre verrouillé : débloquez-le avant de le télécharger.' : `Téléchargement impossible (${res.status})`);
  await cache.put(url, res.clone());
  return res.json();
}

async function saveImage(cache, url) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Image indisponible (${res.status})`);
  const size = Number(res.headers.get('content-length')) || (await res.clone().blob()).size;
  await cache.put(url, res);
  return size;
}

/**
 * Downloads one chapter. onProgress(done, total) is called after each page.
 * lite: store the data-saver copies (much smaller).
 */
export async function downloadChapter({ slug, chapter, title, cover, lite, onProgress }) {
  if (!offlineSupported) throw new Error('Ce navigateur ne permet pas la lecture hors-ligne.');
  try { await navigator.storage?.persist?.(); } catch {}
  const cache = await caches.open(CACHE);

  await saveJson(cache, seriesPath(slug), false);
  await saveJson(cache, chaptersPath(slug), false);
  const pages = await saveJson(cache, pagesPath(slug, chapter), true);
  const list = Array.isArray(pages) ? pages : [];
  const imageUrls = list.map((p) => pageImageUrl(apiAssetUrl(p.url), lite));

  let bytes = 0;
  let done = 0;
  onProgress?.(0, imageUrls.length);
  // A few at a time: fast on good connections without flooding a slow one.
  const queue = [...imageUrls];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      // Read the size first: `bytes += await ...` would read bytes before the await and drop
      // the other workers' additions.
      const size = await saveImage(cache, url);
      bytes += size;
      done += 1;
      onProgress?.(done, imageUrls.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  const coverUrl = cover ? apiAssetUrl(cover) : '';
  if (coverUrl && coverUrl.includes('/storage/')) {
    try { await saveImage(cache, coverUrl); } catch {}
  }

  const entry = {
    slug, chapter, title: title || slug, cover: coverUrl,
    pageCount: imageUrls.length, imageUrls, bytes, lite: Boolean(lite),
    savedAt: new Date().toISOString(),
  };
  writeIndex([...readIndex().filter((d) => !(d.slug === slug && d.chapter === chapter)), entry]);
  return entry;
}

/** Removes a chapter's images (and the series data once no chapter of it is left). */
export async function removeDownload(slug, chapter) {
  const index = readIndex();
  const entry = index.find((d) => d.slug === slug && d.chapter === chapter);
  const rest = index.filter((d) => d !== entry);
  if (offlineSupported) {
    const cache = await caches.open(CACHE);
    await Promise.all((entry?.imageUrls || []).map((u) => cache.delete(u)));
    await cache.delete(apiUrl(pagesPath(slug, chapter)));
    if (!rest.some((d) => d.slug === slug)) {
      await cache.delete(apiUrl(seriesPath(slug)));
      await cache.delete(apiUrl(chaptersPath(slug)));
      if (entry?.cover) await cache.delete(entry.cover);
    }
  }
  writeIndex(rest);
}

export function formatBytes(n) {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/** Registers public/sw.js in production builds (the dev server's hot reload must not be cached). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
