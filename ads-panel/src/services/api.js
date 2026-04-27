function requiredApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_API_BASE_URL in ads-panel/.env');
  }
  return raw;
}

function requiredSessionStorageKey() {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_SESSION_STORAGE_KEY in ads-panel/.env');
  }
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

export const adsApi = {
  async summary() {
    return request('/ads/summary');
  },
  async audits() {
    return request('/ads/audits');
  },
  async listHeroAds() {
    return request('/ads/hero-ads');
  },
  async createHeroAd(payload) {
    return request('/ads/hero-ads', { method: 'POST', body: payload });
  },
  async updateHeroAd(id, patch) {
    return request(`/ads/hero-ads/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  async deleteHeroAd(id) {
    return request(`/ads/hero-ads/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async listNotifications() {
    return request('/ads/notifications');
  },
  async createNotification(payload) {
    return request('/ads/notifications', { method: 'POST', body: payload });
  },
  async updateNotification(id, patch) {
    return request(`/ads/notifications/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  async deleteNotification(id) {
    return request(`/ads/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async listSystemNotices() {
    return request('/ads/system-notices');
  },
  async createSystemNotice(payload) {
    return request('/ads/system-notices', { method: 'POST', body: payload });
  },
  async updateSystemNotice(id, patch) {
    return request(`/ads/system-notices/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  async deleteSystemNotice(id) {
    return request(`/ads/system-notices/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async verticalMangaThumbnails() {
    return request('/ads/manga-thumbnails/vertical');
  },
};

