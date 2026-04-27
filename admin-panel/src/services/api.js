const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL;

async function request(path, { method = 'GET', body, headers } = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  let token = '';
  try {
    const key = import.meta?.env?.VITE_SESSION_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    token = raw ? JSON.parse(raw)?.token || '' : '';
  } catch {}
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : null),
      ...(token ? { Authorization: `Bearer ${token}` } : null),
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

export const adminApi = {
  summary() {
    return request('/admin/summary');
  },
  audits() {
    return request('/admin/audits');
  },
  users() {
    return request('/admin/users');
  },
  updateUser(id, patch) {
    return request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  creatorRequests() {
    return request('/admin/creator-requests');
  },
  reviewCreatorRequest(id, payload) {
    return request(`/admin/creator-requests/${encodeURIComponent(id)}/review`, { method: 'POST', body: payload });
  },
  mangaSubmissions() {
    return request('/admin/manga-submissions');
  },
  reviewMangaSubmission(id, payload) {
    return request(`/admin/manga-submissions/${encodeURIComponent(id)}/review`, { method: 'POST', body: payload });
  },
  mangaRequests() {
    return request('/admin/manga-requests');
  },
  createMangaRequest(payload) {
    return request('/admin/manga-requests', { method: 'POST', body: payload });
  },
  updateMangaRequest(id, patch) {
    return request(`/admin/manga-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  deleteMangaRequest(id) {
    return request(`/admin/manga-requests/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  mangas() {
    return request('/admin/mangas');
  },
  createManga(payload) {
    return request('/admin/mangas', { method: 'POST', body: payload });
  },
  updateManga(id, patch) {
    return request(`/admin/mangas/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  deleteManga(id) {
    return request(`/admin/mangas/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

