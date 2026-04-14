import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { mockDb } from '../../../lib/mockDb.js';

export function CreatorRequestsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState('pending');
  const [query, setQuery] = useState('');
  const [reasonById, setReasonById] = useState({});

  const rows = useMemo(() => {
    const all = mockDb.listCreatorRequests();
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (!q) return true;
      return (
        r.email.toLowerCase().includes(q) ||
        r.displayName.toLowerCase().includes(q) ||
        (r.penName || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query, refreshKey]);

  return (
    <AdminSectionPage
      title="Creator requests"
      description="Creator accounts should be reviewed separately before publishing access."
    >
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
                  placeholder="Search name, email, pen name..."
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
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="all">all</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          {rows.length === 0 ? (
            <div className="admin-muted">No creator requests found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th style={{ width: 220 }}>Pen name</th>
                  <th style={{ width: 240 }}>Genres</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th style={{ width: 260, textAlign: 'right' }}>Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>{r.displayName}</div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {r.email} • {new Date(r.createdAt).toLocaleString()}
                      </div>
                      {r.reason ? (
                        <div className="admin-muted" style={{ marginTop: 6, fontSize: 12 }}>
                          Reason: {r.reason}
                        </div>
                      ) : null}
                    </td>
                    <td className="admin-muted">{r.penName || '—'}</td>
                    <td className="admin-muted">{r.genres || '—'}</td>
                    <td>{r.status}</td>
                    <td>
                      <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
                        <input
                          className="admin-input"
                          value={reasonById[r.id] || ''}
                          onChange={(e) =>
                            setReasonById((m) => ({ ...m, [r.id]: e.target.value }))
                          }
                          placeholder="Optional reason..."
                          style={{ maxWidth: 240 }}
                        />
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn--primary"
                            onClick={() => {
                              mockDb.reviewCreatorRequest(r.id, 'approved', reasonById[r.id] || '');
                              setRefreshKey((k) => k + 1);
                            }}
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            onClick={() => {
                              mockDb.reviewCreatorRequest(
                                r.id,
                                'rejected',
                                reasonById[r.id] || 'Rejected by admin',
                              );
                              setRefreshKey((k) => k + 1);
                            }}
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
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

