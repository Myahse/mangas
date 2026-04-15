import { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SupportSectionPage } from '../../../pages/SupportSectionPage.jsx';
import { mockDb } from '../../../lib/mockDb.js';

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

  const rows = useMemo(() => {
    const all = mockDb.listTickets();
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.user?.email?.toLowerCase().includes(q) ||
        t.user?.name?.toLowerCase().includes(q)
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
          <span>{mockDb.getSummary().ticketsTotal}</span>
        </div>
      }
    >
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
                          mockDb.updateTicket(t.id, { status: e.target.value });
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
                            mockDb.validateTicket(t.id, note);
                            setRefreshKey((k) => k + 1);
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
                            mockDb.rejectTicket(t.id, reason);
                            setRefreshKey((k) => k + 1);
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

