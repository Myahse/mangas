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

export const adsApi = {
  async summary() {
    return request('/ads/summary');
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
  async verticalMangaThumbnails() {
    return request('/ads/manga-thumbnails/vertical');
  },
};

