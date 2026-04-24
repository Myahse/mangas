import { AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adsApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

const emptyForm = {
  severity: 'info',
  title: '',
  message: '',
  status: 'scheduled',
  startsAt: '',
  endsAt: '',
};

export function SystemNoticesPage() {
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allRows, setAllRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    adsApi
      .listSystemNotices()
      .then((rows) => {
        if (cancelled) return;
        setAllRows(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load system notices');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rows = useMemo(() => allRows, [allRows]);

  function onCreate(e) {
    e.preventDefault();
    adsApi
      .createSystemNotice(form)
      .then(() => {
        setForm(emptyForm);
        setRefreshKey((k) => k + 1);
      })
      .catch((err) => notify.error(err?.message || 'Create failed'));
  }

  function onDelete(id) {
    adsApi
      .deleteSystemNotice(id)
      .then(() => setRefreshKey((k) => k + 1))
      .catch((err) => notify.error(err?.message || 'Delete failed'));
  }

  function setActive(id, active) {
    adsApi
      .updateSystemNotice(id, { status: active ? 'active' : 'disabled' })
      .then(() => setRefreshKey((k) => k + 1))
      .catch((err) => notify.error(err?.message || 'Update failed'));
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">
          <AlertTriangle size={18} /> System notices
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
            <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 10 }}>Create notice</h2>
            <form onSubmit={onCreate} className="admin-actions" style={{ flexDirection: 'column' }}>
              <div className="admin-grid-2">
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Severity
                  </div>
                  <select
                    className="admin-select"
                    value={form.severity}
                    onChange={(e) => setForm((s) => ({ ...s, severity: e.target.value }))}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
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
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="ended">Ended</option>
                  </select>
                </label>
              </div>

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
                  Message
                </div>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                />
              </label>

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
                  <th>Notice</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>
                        {row.severity.toUpperCase()} — {row.title}
                      </div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {row.message?.slice(0, 120) || '—'}
                        {row.message?.length > 120 ? '…' : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 900, color: row.status === 'active' ? 'var(--primary)' : undefined }}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn" type="button" onClick={() => setActive(row.id, true)}>
                          Activate
                        </button>
                        <button className="admin-btn" type="button" onClick={() => setActive(row.id, false)}>
                          Disable
                        </button>
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
                      No notices yet.
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

