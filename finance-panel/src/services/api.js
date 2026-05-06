function requiredApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    // Dev-safe fallback: avoid hard crash when .env is missing.
    return 'http://localhost:8088/api/v1';
  }
  return raw;
}

function requiredSessionStorageKey() {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    // Dev-safe fallback: avoid hard crash when .env is missing.
    return 'MangAfriq_finance_session';
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

export const financeApi = {
  summary() {
    return request('/finance/summary');
  },
  listTransactions({ limit = 50 } = {}) {
    return request(`/finance/transactions?limit=${encodeURIComponent(limit)}`);
  },
  createTransaction(payload) {
    return request('/finance/transactions', { method: 'POST', body: payload });
  },
};

