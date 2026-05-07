function requiredApiBaseUrl() {
  const raw  = String(import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_API_BASE_URL in support-panel/.env');
  }
  return raw;
}

function requiredSessionStorageKey() {
  const raw = String(import.meta.env.VITE_SESSION_STORAGE_KEY ?? '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') {
    throw new Error('Missing VITE_SESSION_STORAGE_KEY in support-panel/.env');
  }
  return raw;
}

function apiBase() {
  return requiredApiBaseUrl().replace(/\/$/, '');
}

export function storageObjectUrl(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  const base = apiBase();
  // Some envs set VITE_API_BASE_URL to host only (without /api/v1).
  // Storage is served from /api/v1/storage/:key.
  const v1 = base.includes('/api/v1') ? base.replace(/\/api\/v1\/?$/, '/api/v1') : `${base}/api/v1`;
  return `${v1}/storage/${k}`;
}
 
async function postMultipart(path, formData) {
  const url = `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  let token = '';
  try {
    const key = requiredSessionStorageKey();
    const raw = localStorage.getItem(key);
    token = raw ? JSON.parse(raw)?.token || '' : '';
  } catch {}
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : null),
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
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
  sendMessage(ticketId, from, text, attachment) {
    const body = { from, text: text ?? '' };
    if (attachment?.key) {
      body.attachmentKey = attachment.key;
      body.attachmentName = attachment.name;
      body.attachmentContentType = attachment.contentType;
    }
    return request(`/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
      method: 'POST',
      body,
    });
  },
  uploadAttachment(ticketId, file) {
    const fd = new FormData();
    fd.append('file', file);
    return postMultipart(`/support/tickets/${encodeURIComponent(ticketId)}/attachments`, fd);
  },
};

