const PREFIX =
  import.meta.env.VITE_ADS_STORAGE_PREFIX;

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
  void prefix;
  return crypto.randomUUID();
}

