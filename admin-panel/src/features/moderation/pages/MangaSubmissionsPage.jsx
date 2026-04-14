import { useMemo, useState } from 'react';
import { CheckCircle2, RefreshCcw, XCircle } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { mockDb } from '../../../lib/mockDb.js';

export function MangaSubmissionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState('pending');
  const [query, setQuery] = useState('');
  const [reasonById, setReasonById] = useState({});

  const rows = useMemo(() => {
    const all = mockDb.listMangaSubmissions();
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      if (status !== 'all' && s.status !== status) return false;
      if (!q) return true;
      const title = (s.payload?.title || '').toLowerCase();
      const creator = `${s.creator?.displayName || ''} ${s.creator?.email || ''}`.toLowerCase();
      return title.includes(q) || creator.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query, refreshKey]);

  return (
    <AdminSectionPage
      title="Manga submissions"
      description="Review new manga/series created by creators. Approve, reject, or request resubmission with a reason."
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
                  placeholder="Search title or creator..."
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
                  <option value="resubmit">resubmit</option>
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
            <div className="admin-muted">No submissions found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Submission</th>
                  <th style={{ width: 180 }}>Creator</th>
                  <th style={{ width: 120 }}>Explicit</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 320, textAlign: 'right' }}>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>
                        {s.payload?.title || 'Untitled'}
                      </div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                      <div className="admin-muted" style={{ marginTop: 8, fontSize: 12 }}>
                        {s.payload?.summary ? `Summary: ${s.payload.summary}` : '—'}
                      </div>
                      {s.moderation?.reason ? (
                        <div
                          className="admin-muted"
                          style={{ marginTop: 8, fontSize: 12 }}
                        >
                          Decision reason: {s.moderation.reason}
                        </div>
                      ) : null}
                    </td>
                    <td className="admin-muted">
                      <div>{s.creator?.displayName || '—'}</div>
                      <div style={{ fontSize: 12 }}>{s.creator?.email || '—'}</div>
                    </td>
                    <td>{s.payload?.explicit ? 'yes' : 'no'}</td>
                    <td>{s.status}</td>
                    <td>
                      <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
                        <input
                          className="admin-input"
                          value={reasonById[s.id] || ''}
                          onChange={(e) =>
                            setReasonById((m) => ({ ...m, [s.id]: e.target.value }))
                          }
                          placeholder="Required for reject/resubmit..."
                          style={{ maxWidth: 300 }}
                        />
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn--primary"
                            onClick={() => {
                              mockDb.reviewMangaSubmission(s.id, 'approved', '');
                              setRefreshKey((k) => k + 1);
                            }}
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </button>
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => {
                              const reason = (reasonById[s.id] || '').trim();
                              if (!reason) {
                                alert('Please provide a reason to request resubmission.');
                                return;
                              }
                              mockDb.reviewMangaSubmission(s.id, 'resubmit', reason);
                              setRefreshKey((k) => k + 1);
                            }}
                          >
                            <RefreshCcw size={16} />
                            Resubmit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            onClick={() => {
                              const reason = (reasonById[s.id] || '').trim();
                              if (!reason) {
                                alert('Please provide a reason to reject.');
                                return;
                              }
                              mockDb.reviewMangaSubmission(s.id, 'rejected', reason);
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

