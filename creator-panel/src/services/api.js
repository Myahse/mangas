function requiredApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_API_BASE_URL in creator-panel/.env');
  }
  return raw;
}

function requiredSessionStorageKey() {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_SESSION_STORAGE_KEY in creator-panel/.env');
  }
  return raw;
}

function apiBase() {
  return requiredApiBaseUrl().replace(/\/$/, '');
}

export function getApiBase() {
  return apiBase();
}

/** Turn API-relative storage URLs into absolute URLs for <img src>. */
export function apiAssetUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^(https?:|blob:|data:)/i.test(u)) return u;
  const base = apiBase();
  const origin = base.replace(/\/api\/v1\/?$/i, '');
  if (u.startsWith('/')) return `${origin}${u}`;
  return `${base.replace(/\/$/, '')}/${u.replace(/^\//, '')}`;
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const url = `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  let token = '';
  try {
    const key = requiredSessionStorageKey();
    const raw = localStorage.getItem(key);
    token = raw ? JSON.parse(raw)?.token || '' : '';
  } catch {}
  const res = await fetch(url, {
    method,
    cache: 'no-store',
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : null),
      ...(token ? { Authorization: `Bearer ${token}` } : null),
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
    const key = requiredSessionStorageKey();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const creatorApi = {
  // Storage (R2 via backend)
  async uploadFile({ file, prefix, normalize }) {
    const fd = new FormData();
    fd.append('file', file);
    const params = new URLSearchParams();
    if (prefix) params.set('prefix', prefix);
    if (normalize) params.set('normalize', normalize);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/storage/upload${qs}`, { method: 'POST', body: fd });
  },

  async uploadMangaArchive({ file, prefix, normalize = 'episode_page' }) {
    const fd = new FormData();
    fd.append('file', file);
    const params = new URLSearchParams();
    if (prefix) params.set('prefix', prefix);
    if (normalize) params.set('normalize', normalize);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/storage/upload-manga-archive${qs}`, { method: 'POST', body: fd });
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
    return request('/creator/submissions');
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
  async createSupportTicket(payload) {
    return request('/support/public/tickets', { method: 'POST', body: payload });
  },

  // Coins / wallet
  async wallet() {
    return request('/wallet');
  },
};

