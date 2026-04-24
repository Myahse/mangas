import { Bell, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adsApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

const emptyForm = {
  channel: 'push',
  title: '',
  body: '',
  target: 'all',
  segment: '',
  userId: '',
  deepLink: '',
  status: 'draft',
  scheduledAt: '',
};

export function NotificationsPage() {
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allRows, setAllRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    adsApi
      .listNotifications()
      .then((rows) => {
        if (cancelled) return;
        setAllRows(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load notifications');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rows = useMemo(() => allRows, [allRows]);

  function onCreate(e) {
    e.preventDefault();
    adsApi
      .createNotification(form)
      .then(() => {
        setForm(emptyForm);
        setRefreshKey((k) => k + 1);
      })
      .catch((err) => notify.error(err?.message || 'Create failed'));
  }

  function onQueue(id) {
    adsApi
      .updateNotification(id, { status: 'queued' })
      .then(() => setRefreshKey((k) => k + 1))
      .catch((err) => notify.error(err?.message || 'Update failed'));
  }

  function onDelete(id) {
    adsApi
      .deleteNotification(id)
      .then(() => setRefreshKey((k) => k + 1))
      .catch((err) => notify.error(err?.message || 'Delete failed'));
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">
          <Bell size={18} /> Notifications
        </h1>
      </div>

      {error ? (
        <div className="admin-surface" style={{ marginBottom: 14 }}>
          <div className="admin-surface__inner">
            <div className="admin-muted">{error}</div>
          </div>
        </div>
      ) : null}

      <div className="admin-grid-2">
        <section className="admin-surface">
          <div className="admin-surface__inner">
            <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 10 }}>Create notification</h2>
            <form onSubmit={onCreate} className="admin-actions" style={{ flexDirection: 'column' }}>
              <div className="admin-grid-2">
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Channel
                  </div>
                  <select
                    className="admin-select"
                    value={form.channel}
                    onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value }))}
                  >
                    <option value="push">Push (mobile)</option>
                    <option value="in_app">In-app</option>
                  </select>
                </label>
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Target
                  </div>
                  <select
                    className="admin-select"
                    value={form.target}
                    onChange={(e) => setForm((s) => ({ ...s, target: e.target.value }))}
                  >
                    <option value="all">All users</option>
                    <option value="segment">Segment</option>
                    <option value="user">Single user</option>
                  </select>
                </label>
              </div>

              {form.target === 'segment' ? (
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Segment
                  </div>
                  <input
                    className="admin-input"
                    value={form.segment}
                    onChange={(e) => setForm((s) => ({ ...s, segment: e.target.value }))}
                    placeholder="e.g. creators, active_readers"
                  />
                </label>
              ) : null}

              {form.target === 'user' ? (
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    User ID
                  </div>
                  <input
                    className="admin-input"
                    value={form.userId}
                    onChange={(e) => setForm((s) => ({ ...s, userId: e.target.value }))}
                    placeholder="u_..."
                  />
                </label>
              ) : null}

              <label>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Title
                </div>
                <input
                  className="admin-input"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                />
              </label>

              <label>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Body
                </div>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
                  placeholder="Message text"
                />
              </label>

              <div className="admin-grid-2">
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Deep link
                  </div>
                  <input
                    className="admin-input"
                    value={form.deepLink}
                    onChange={(e) => setForm((s) => ({ ...s, deepLink: e.target.value }))}
                    placeholder="/home"
                  />
                </label>
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Status
                  </div>
                  <select
                    className="admin-select"
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="queued">Queued</option>
                    <option value="sent">Sent</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
                <button className="admin-btn admin-btn--primary" type="submit">
                  Create
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="admin-surface">
          <div className="admin-surface__inner">
            <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 10 }}>Existing</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>
                        {row.channel === 'push' ? 'Push' : 'In-app'} — {row.title}
                      </div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {row.target === 'all'
                          ? 'All users'
                          : row.target === 'segment'
                            ? `Segment: ${row.segment || '—'}`
                            : `User: ${row.userId || '—'}`}
                        {row.deepLink ? ` • ${row.deepLink}` : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 900, color: row.status === 'queued' ? 'var(--primary)' : undefined }}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        {row.status === 'draft' ? (
                          <button className="admin-btn" type="button" onClick={() => onQueue(row.id)}>
                            <Send size={16} /> Queue
                          </button>
                        ) : null}
                        <button
                          className="admin-btn admin-btn--danger"
                          type="button"
                          onClick={() => onDelete(row.id)}
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="admin-muted" style={{ padding: 14 }}>
                      No notifications yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

