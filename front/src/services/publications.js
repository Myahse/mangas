const KEY = 'creator_panel_episode_published';

function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadPublishedEpisodes() {
  const v = safeJsonParse(localStorage.getItem(KEY));
  return Array.isArray(v) ? v : [];
}

export function incrementPublishedEpisodeView(id) {
  const list = loadPublishedEpisodes();
  const idx = list.findIndex((e) => e?.id === id);
  if (idx === -1) return;
  const e = list[idx];
  list[idx] = { ...e, stats: { ...(e.stats ?? {}), views: (e.stats?.views ?? 0) + 1 } };
  localStorage.setItem(KEY, JSON.stringify(list));
}

