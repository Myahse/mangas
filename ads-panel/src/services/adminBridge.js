const STORAGE_PREFIX = 'mangaafrik_ads_admin:';
const DB_KEY = 'db_v1';

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readDb() {
  return safeParse(window.localStorage.getItem(STORAGE_PREFIX + DB_KEY), null);
}

export function getHeroAds() {
  return readDb()?.heroAds ?? [];
}

export function getActiveHeroAds() {
  return getHeroAds().filter((a) => a.status === 'active');
}

export function getNotifications() {
  return readDb()?.notifications ?? [];
}

export function getQueuedPushNotifications() {
  return getNotifications().filter((n) => n.channel === 'push' && n.status === 'queued');
}

export function getSystemNotices() {
  return readDb()?.systemNotices ?? [];
}

export function getActiveSystemNotices() {
  return getSystemNotices().filter((n) => n.status === 'active');
}

