import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { mockDb } from '../../../lib/mockDb.js';
import { notify } from '../../../services/notify.js';

const STATUS_OPTIONS = ['new', 'in_review', 'done', 'rejected'];

export function MangaRequestsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const [create, setCreate] = useState({
    requestedTitle: '',
    requestedBy: '',
    notes: '',
  });

  const rows = useMemo(() => {
    const all = mockDb.listMangaRequests();
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (!q) return true;
      return (
        r.requestedTitle.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, refreshKey]);

  return (
    <AdminSectionPage
      title="Manga requests"
      description="Triage what users want to see added to the platform."
      right={
        <button
          className="admin-btn admin-btn--primary"
          type="button"
          onClick={() => {
            const created = mockDb.createMangaRequest(create);
            setCreate({ requestedTitle: '', requestedBy: '', notes: '' });
            setRefreshKey((k) => k + 1);
            notify.success(`Request created: ${created.id}`);
          }}
          disabled={!create.requestedTitle.trim()}
        >
          <Plus size={16} />
          Add request
        </button>
      }
    >
      <div className="admin-surface">
        <div className="admin-surface__inner">
          <div className="admin-grid-2">
            <div>
              <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                Title
              </div>
              <div style={{ marginTop: 6 }}>
                <input
                  className="admin-input"
                  value={create.requestedTitle}
                  onChange={(e) =>
                    setCreate((c) => ({ ...c, requestedTitle: e.target.value }))
                  }
                  placeholder="Manga title requested"
                />
              </div>
            </div>
            <div>
              <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                Requested by
              </div>
              <div style={{ marginTop: 6 }}>
                <input
                  className="admin-input"
                  value={create.requestedBy}
                  onChange={(e) =>
                    setCreate((c) => ({ ...c, requestedBy: e.target.value }))
                  }
                  placeholder="email or username"
                />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
              Notes
            </div>
            <div style={{ marginTop: 6 }}>
              <textarea
                className="admin-textarea"
                rows={3}
                value={create.notes}
                onChange={(e) => setCreate((c) => ({ ...c, notes: e.target.value }))}
                placeholder="Any additional details..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          <div className="admin-grid-2">
            <div>
              <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                Search
              </div>
              <div style={{ marginTop: 6 }}>
                <input
                  className="admin-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, requester, notes..."
                />
              </div>
            </div>
            <div>
              <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                Status
              </div>
              <div style={{ marginTop: 6 }}>
                <select
                  className="admin-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          {rows.length === 0 ? (
            <div className="admin-muted">No requests match your filters.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Title</th>
                  <th style={{ width: 220 }}>Requested by</th>
                  <th>Notes</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 190, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 750 }}>{r.requestedTitle}</div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>{r.requestedBy}</td>
                    <td className="admin-muted" style={{ maxWidth: 520 }}>
                      {r.notes || '—'}
                    </td>
                    <td>
                      <select
                        className="admin-select"
                        value={r.status}
                        onChange={(e) => {
                          mockDb.updateMangaRequest(r.id, {
                            status: e.target.value,
                          });
                          setRefreshKey((k) => k + 1);
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-btn admin-btn--danger"
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete request “${r.requestedTitle}”? This cannot be undone.`,
                              )
                            ) {
                              mockDb.deleteMangaRequest(r.id);
                              setRefreshKey((k) => k + 1);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminSectionPage>
  );
}

