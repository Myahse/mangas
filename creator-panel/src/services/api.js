const DEFAULT_BASE = 'http://localhost:8082/api/v1';

async function request(path, { method = 'GET', body, headers } = {}) {
  const base = (import.meta?.env?.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : null),
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

function readSession() {
  try {
    const raw = localStorage.getItem('mangafrik_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const creatorApi = {
  // Series submissions
  async createSubmission(payload) {
    const session = readSession();
    return request('/creator/submissions', {
      method: 'POST',
      body: {
        creatorEmail: session?.email || 'unknown',
        creatorDisplayName: session?.displayName || 'Unknown creator',
        payload,
      },
    });
  },
  async listMySubmissions() {
    const session = readSession();
    const email = encodeURIComponent(session?.email || '');
    const qs = email ? `?email=${email}` : '';
    return request(`/creator/submissions${qs}`);
  },

  // Episodes
  async listDrafts() {
    return request('/creator/episodes/drafts');
  },
  async createDraft(draft) {
    return request('/creator/episodes/drafts', { method: 'POST', body: draft });
  },
  async listPublished() {
    return request('/creator/episodes/published');
  },
  async createPublished(entry) {
    return request('/creator/episodes/published', { method: 'POST', body: entry });
  },
  async addView(id) {
    return request(`/creator/episodes/published/${encodeURIComponent(id)}/view`, { method: 'POST' });
  },
  async addLike(id) {
    return request(`/creator/episodes/published/${encodeURIComponent(id)}/like`, { method: 'POST' });
  },
  async addComment(id, comment) {
    return request(`/creator/episodes/published/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: comment,
    });
  },
};

