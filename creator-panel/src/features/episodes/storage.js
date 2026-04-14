const DRAFTS_KEY = 'creator_panel_episode_drafts';
const PUBLISHED_KEY = 'creator_panel_episode_published';

function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadEpisodeDrafts() {
  const v = safeJsonParse(localStorage.getItem(DRAFTS_KEY));
  return Array.isArray(v) ? v : [];
}

export function saveEpisodeDraft(draft) {
  const drafts = loadEpisodeDrafts();
  drafts.unshift(draft);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 50)));
}

export function loadPublishedEpisodes() {
  const v = safeJsonParse(localStorage.getItem(PUBLISHED_KEY));
  return Array.isArray(v) ? v : [];
}

export function savePublishedEpisode(entry) {
  const list = loadPublishedEpisodes();
  list.unshift(entry);
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(list.slice(0, 200)));
}

export function updatePublishedEpisode(id, updater) {
  const list = loadPublishedEpisodes();
  const idx = list.findIndex((e) => e?.id === id);
  if (idx === -1) return;
  const next = typeof updater === 'function' ? updater(list[idx]) : { ...list[idx], ...updater };
  list[idx] = next;
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(list));
}

export function incrementPublishedEpisodeView(id) {
  updatePublishedEpisode(id, (e) => ({ ...e, stats: { ...(e.stats ?? {}), views: (e.stats?.views ?? 0) + 1 } }));
}

export function togglePublishedEpisodeLike(id) {
  updatePublishedEpisode(id, (e) => ({ ...e, stats: { ...(e.stats ?? {}), likes: (e.stats?.likes ?? 0) + 1 } }));
}

export function addPublishedEpisodeComment(id, comment) {
  updatePublishedEpisode(id, (e) => ({
    ...e,
    comments: [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...comment }, ...(e.comments ?? [])],
    stats: { ...(e.stats ?? {}), comments: (e.stats?.comments ?? 0) + 1 },
  }));
}

