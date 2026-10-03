import { creatorApi } from '../services/api';

const LS_LAST_SERIES = 'MangAfric_creator_last_series_v1';
const LS_SERIES_THUMBS = 'MangAfric_creator_series_thumbs_v1';

export function readLastSeriesTitle() {
  try {
    const raw = localStorage.getItem(LS_LAST_SERIES);
    if (raw) {
      const o = JSON.parse(raw);
      const t = String(o?.title || '').trim();
      if (t) return t;
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(LS_SERIES_THUMBS);
    if (raw) {
      const o = JSON.parse(raw);
      const t = String(o?.title || '').trim();
      if (t) return t;
    }
  } catch {
    /* ignore */
  }
  return '';
}

export function persistLastSeriesTitle(title) {
  const t = String(title || '').trim();
  if (!t) return;
  try {
    localStorage.setItem(LS_LAST_SERIES, JSON.stringify({ title: t, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** Unique series titles from submissions, drafts, published episodes, and local storage. */
export async function fetchSeriesTitleOptions() {
  const seen = new Map();
  const add = (title, sortKey = 0) => {
    const t = String(title || '').trim();
    if (!t) return;
    const key = t.toLowerCase();
    const prev = seen.get(key);
    if (!prev || sortKey > prev.sortKey) {
      seen.set(key, { title: t, sortKey });
    }
  };

  add(readLastSeriesTitle(), Date.now());

  try {
    const subs = await creatorApi.listMySubmissions();
    const list = Array.isArray(subs) ? subs : [];
    list.forEach((s, i) => {
      add(s?.payload?.title, list.length - i);
    });
  } catch {
    /* ignore */
  }

  try {
    const [published, drafts] = await Promise.all([
      creatorApi.listPublished(),
      creatorApi.listDrafts(),
    ]);
    const eps = [...(Array.isArray(published) ? published : []), ...(Array.isArray(drafts) ? drafts : [])];
    eps.forEach((ep, i) => {
      const at = ep?.publishedAt || ep?.createdAt;
      const ts = at ? new Date(at).getTime() : eps.length - i;
      add(ep?.seriesTitle, ts);
    });
  } catch {
    /* ignore */
  }

  return Array.from(seen.values())
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((x) => x.title);
}

export async function resolveDefaultSeriesTitle(urlTitle) {
  const fromUrl = String(urlTitle || '').trim();
  if (fromUrl) return fromUrl;

  const last = readLastSeriesTitle();
  if (last) return last;

  const options = await fetchSeriesTitleOptions();
  return options[0] || '';
}
