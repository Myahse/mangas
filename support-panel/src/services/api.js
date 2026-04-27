const DEFAULT_BASE =
  import.meta?.env?.VITE_API_BASE_URL_DEFAULT || 'http://localhost:8082/api/v1';
 
function apiBase() {
  return (import.meta?.env?.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
}
 
async function request(path, { method = 'GET', body, headers } = {}) {
  const base = apiBase();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  let token = '';
  try {
    const key = import.meta?.env?.VITE_SESSION_STORAGE_KEY || 'mangafrik_session';
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
 
export const supportApi = {
  summary() {
    return request('/support/summary');
  },
  audits() {
    return request('/support/audits');
  },
  listTickets() {
    return request('/support/tickets');
  },
  getTicket(id) {
    return request(`/support/tickets/${encodeURIComponent(id)}`);
  },
  updateTicket(id, patch) {
    return request(`/support/tickets/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },
  validateTicket(id, note = '') {
    return request(`/support/tickets/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
      body: { note },
    });
  },
  rejectTicket(id, reason = '') {
    return request(`/support/tickets/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: { reason },
    });
  },
  listMessages(ticketId) {
    return request(`/support/tickets/${encodeURIComponent(ticketId)}/messages`);
  },
  sendMessage(ticketId, from, text) {
    return request(`/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
      method: 'POST',
      body: { from, text },
    });
  },
};

