  const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL;

async function request(path, { method = 'GET', body, headers } = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : null),
      ...(headers || null),
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
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
    const key = import.meta?.env?.VITE_SESSION_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const creatorApi = {
  // Storage (R2 via backend)
  async uploadFile({ file, prefix }) {
    const fd = new FormData();
    fd.append('file', file);
    const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
    return request(`/storage/upload${qs}`, { method: 'POST', body: fd });
  },

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

