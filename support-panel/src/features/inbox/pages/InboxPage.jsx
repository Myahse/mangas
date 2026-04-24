import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SupportSectionPage } from '../../../pages/SupportSectionPage.jsx';
import { supportApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

const TYPE_OPTIONS = ['issue', 'request'];
const STATUS_OPTIONS = ['new', 'in_review', 'validated', 'rejected'];

function prettyType(t) {
  return t === 'issue' ? 'Issue' : 'Request';
}

export function InboxPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [allTickets, setAllTickets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    Promise.all([supportApi.summary(), supportApi.listTickets()])
      .then(([s, t]) => {
        if (cancelled) return;
        setSummary(s);
        setAllTickets(Array.isArray(t) ? t : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load inbox');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rows = useMemo(() => {
    const all = allTickets;
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.user?.email || '').toLowerCase().includes(q) ||
        (t.user?.name || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, status, refreshKey]);

  return (
    <SupportSectionPage
      title="Inbox"
      description="Every issue and request comes here for triage, validation, rejection, and follow-up."
      right={
        <div className="support-badge">
          <span style={{ opacity: 0.8 }}>Total</span>
          <span>{summary ? summary.ticketsTotal : '—'}</span>
        </div>
      }
    >
      {error ? (
        <div className="support-surface">
          <div className="support-surface__inner">
            <div className="support-muted">{error}</div>
          </div>
        </div>
      ) : null}
      <div className="support-surface">
        <div className="support-surface__inner">
          <div className="support-grid-3">
            <div>
              <div className="support-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                Search
              </div>
              <div style={{ marginTop: 6 }}>
                <input
                  className="support-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search subject, user, description..."
                />
              </div>
            </div>
            <div>
              <div className="support-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                Type
              </div>
              <div style={{ marginTop: 6 }}>
                <select
                  className="support-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="all">All</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {prettyType(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="support-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                Status
              </div>
              <div style={{ marginTop: 6 }}>
                <select
                  className="support-select"
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

      <div className="support-surface">
        <div className="support-surface__inner">
          {rows.length === 0 ? (
            <div className="support-muted">No tickets match your filters.</div>
          ) : (
            <table className="support-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Type</th>
                  <th>Subject</th>
                  <th style={{ width: 240 }}>User</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th style={{ width: 330, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="support-badge">{prettyType(t.type)}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 900 }}>{t.subject}</div>
                      <div className="support-muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {t.description}
                      </div>
                      <div className="support-muted" style={{ fontSize: 12, marginTop: 6 }}>
                        {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800 }}>{t.user?.name || 'Unknown'}</div>
                      <div className="support-muted" style={{ fontSize: 12 }}>
                        {t.user?.email || '—'}
                      </div>
                    </td>
                    <td>
                      <select
                        className="support-select"
                        value={t.status}
                        onChange={(e) => {
                          supportApi
                            .updateTicket(t.id, { status: e.target.value })
                            .then(() => setRefreshKey((k) => k + 1))
                            .catch((err) => notify.error(err?.message || 'Update failed'));
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
                      <div className="support-row-actions">
                        <button
                          className="support-btn"
                          type="button"
                          onClick={() => navigate(`/chat?ticket=${encodeURIComponent(t.id)}`)}
                        >
                          <MessageCircle size={16} />
                          Chat
                        </button>
                        <button
                          className="support-btn support-btn--primary"
                          type="button"
                          onClick={() => {
                            const note = prompt('Validation note (optional):', '') || '';
                            supportApi
                              .validateTicket(t.id, note)
                              .then(() => setRefreshKey((k) => k + 1))
                              .catch((err) => notify.error(err?.message || 'Validate failed'));
                          }}
                        >
                          <CheckCircle2 size={16} />
                          Validate
                        </button>
                        <button
                          className="support-btn support-btn--danger"
                          type="button"
                          onClick={() => {
                            const reason = prompt('Rejection reason (optional):', '') || '';
                            supportApi
                              .rejectTicket(t.id, reason)
                              .then(() => setRefreshKey((k) => k + 1))
                              .catch((err) => notify.error(err?.message || 'Reject failed'));
                          }}
                        >
                          <XCircle size={16} />
                          Reject
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
    </SupportSectionPage>
  );
}

