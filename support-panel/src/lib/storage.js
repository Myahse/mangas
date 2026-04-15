const PREFIX = 'mangaafrik_support:';

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function randomId(prefix = '') {
  const rand = Math.random().toString(16).slice(2);
  return `${prefix}${Date.now().toString(16)}_${rand}`;
}

