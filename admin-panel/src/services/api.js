function requiredApiBaseUrl() {
    const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_API_BASE_URL in admin-panel/.env');
  }
  return raw;
}

function requiredSessionStorageKey() {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  // Fail-open in production deployments: use a stable default to avoid a hard crash
  // if the env var wasn't configured in Vercel.
  if (!raw || raw === 'undefined' || raw === 'null') return 'MangAfric_session';
  return raw;
}

function apiBase() {
  return requiredApiBaseUrl().replace(/\/$/, '');
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
  createUser(payload) {
    return request('/admin/users', { method: 'POST', body: payload });
  },
  updateUser(id, patch) {
    return request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  resetUserCredentials(id) {
    return request(`/admin/users/${encodeURIComponent(id)}/reset-credentials`, { method: 'POST' });
  },
  creatorRequests() {
    return request('/admin/creator-requests');
  },
  reviewCreatorRequest(id, payload) {
    return request(`/admin/creator-requests/${encodeURIComponent(id)}/review`, { method: 'POST', body: payload });
  },
  getCreatorContractForRequest(id) {
    return request(`/admin/creator-contracts/creator-requests/${encodeURIComponent(id)}`);
  },
  adminSignCreatorContract(id, payload) {
    return request(`/admin/creator-contracts/creator-requests/${encodeURIComponent(id)}/admin-sign`, { method: 'POST', body: payload });
  },
  sendCreatorContractPdf(id) {
    return request(`/admin/creator-contracts/creator-requests/${encodeURIComponent(id)}/send-pdf`, { method: 'POST' });
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
  updateManga(id, patch) {
    return request(`/admin/mangas/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  deleteManga(id) {
    return request(`/admin/mangas/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  grantCoins(payload) {
    return request('/admin/wallet/grant', { method: 'POST', body: payload });
  },
  featureFlags() {
    return request('/admin/feature-flags');
  },
  updateFeatureFlag(key, enabled) {
    return request('/admin/feature-flags', { method: 'PATCH', body: { key, enabled } });
  },
  markCoinPurchasePaid(id) {
    return request(`/admin/store/coin-purchase-intents/${encodeURIComponent(id)}/mark-paid`, { method: 'POST' });
  },
};

