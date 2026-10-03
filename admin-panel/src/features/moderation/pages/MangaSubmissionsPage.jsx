import { Fragment, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Eye, RefreshCcw, XCircle } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { notify } from '../../../services/notify.js';
import { adminApi } from '../../../services/api.js';
import { MangaSubmissionContentPanel } from '../components/MangaSubmissionContentPanel.jsx';
import { submissionSquareThumb } from '../lib/submissionAssets.js';
import './MangaSubmissionsPage.css';

function parseApiError(err) {
  const raw = String(err?.message || 'Review failed');
  try {
    const json = JSON.parse(raw);
    return json?.message || json?.error || raw;
  } catch {
    return raw;
  }
}

function ModerationActions({ s, reasonById, setReasonById, onDone, onPatched, busy, setBusy }) {
  const runReview = async (decision, reason, successMessage) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await adminApi.reviewMangaSubmission(s.id, { decision, reason });
      if (updated?.id) onPatched(updated);
      notify.success(successMessage);
      await onDone();
    } catch (err) {
      notify.error(parseApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
      <input
        className="admin-input"
        value={reasonById[s.id] || ''}
        onChange={(e) => setReasonById((m) => ({ ...m, [s.id]: e.target.value }))}
        placeholder="Required for reject/resubmit..."
        style={{ maxWidth: 300 }}
        disabled={busy}
      />
      <div className="admin-row-actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={busy}
          onClick={() => runReview('approved', '', 'Submission approved.')}
        >
          <CheckCircle2 size={16} />
          Approve
        </button>
        <button
          type="button"
          className="admin-btn"
          disabled={busy}
          onClick={() => {
            const reason = (reasonById[s.id] || '').trim();
            if (!reason) {
              notify.info('Please provide a reason to request resubmission.');
              return;
            }
            runReview('resubmit', reason, 'Resubmission requested.');
          }}
        >
          <RefreshCcw size={16} />
          Resubmit
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--danger"
          disabled={busy}
          onClick={() => {
            const reason = (reasonById[s.id] || '').trim();
            if (!reason) {
              notify.info('Please provide a reason to reject.');
              return;
            }
            runReview('rejected', reason, 'Submission rejected.');
          }}
        >
          <XCircle size={16} />
          Reject
        </button>
      </div>
    </div>
  );
}

export function MangaSubmissionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [reasonById, setReasonById] = useState({});
  const [allRows, setAllRows] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const reloadSubmissions = async () => {
    const rows = await adminApi.mangaSubmissions();
    setAllRows(Array.isArray(rows) ? rows : []);
  };

  const reloadEpisodeContent = async () => {
    try {
      const [draftRows, pubRows] = await Promise.all([
        adminApi.creatorEpisodeDrafts(),
        adminApi.creatorEpisodesPublished(),
      ]);
      setDrafts(Array.isArray(draftRows) ? draftRows : []);
      setPublished(Array.isArray(pubRows) ? pubRows : []);
    } catch {
      /* Episode preview is optional; do not block moderation. */
    }
  };

  useEffect(() => {
    let cancelled = false;
    setError('');
    (async () => {
      try {
        await reloadSubmissions();
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load submissions');
      }
      if (!cancelled) await reloadEpisodeContent();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const onReviewDone = async () => {
    try {
      await reloadSubmissions();
    } catch (e) {
      notify.error(parseApiError(e));
    }
  };

  const onSubmissionPatched = (patch) => {
    if (!patch?.id) return;
    setAllRows((rows) => rows.map((r) => (r.id === patch.id ? { ...r, ...patch } : r)));
  };

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo(() => {
    const all = allRows;
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      if (status !== 'all' && String(s.status || '').toLowerCase() !== status) return false;
      if (!q) return true;
      const title = (s.payload?.title || '').toLowerCase();
      const creator = `${s.creator?.displayName || ''} ${s.creator?.email || ''}`.toLowerCase();
      return title.includes(q) || creator.includes(q);
    });
  }, [allRows, status, query]);

  return (
    <AdminSectionPage
      title="Manga submissions"
      description="Review series covers, summaries, and episode pages before approve / reject / resubmit."
    >
      <div className="admin-actions" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="admin-btn"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          <RefreshCcw size={16} />
          Refresh list
        </button>
      </div>
      {error ? (
        <div className="admin-surface">
          <div className="admin-surface__inner">
            <div className="admin-muted">{error}</div>
          </div>
        </div>
      ) : null}
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
                {rows.map((s) => {
                  const thumb = submissionSquareThumb(s.payload);
                  const open = expandedId === s.id;
                  return (
                    <Fragment key={s.id}>
                      <tr>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            {thumb ? (
                              <img className="admin-submission-row-thumb" src={thumb} alt="" />
                            ) : (
                              <div
                                className="admin-submission-row-thumb"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  color: 'var(--text-muted)',
                                }}
                                aria-hidden
                              >
                                —
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 900 }}>{s.payload?.title || 'Untitled'}</div>
                              <div className="admin-muted" style={{ fontSize: 12 }}>
                                {new Date(s.createdAt).toLocaleString()}
                              </div>
                              <div className="admin-muted" style={{ marginTop: 8, fontSize: 12 }}>
                                {s.payload?.summary
                                  ? `${String(s.payload.summary).slice(0, 140)}${String(s.payload.summary).length > 140 ? '…' : ''}`
                                  : '—'}
                              </div>
                              {s.moderation?.reason ? (
                                <div className="admin-muted" style={{ marginTop: 8, fontSize: 12 }}>
                                  Decision reason: {s.moderation.reason}
                                </div>
                              ) : null}
                              <button
                                type="button"
                                className="admin-btn"
                                style={{ marginTop: 10 }}
                                onClick={() => setExpandedId(open ? null : s.id)}
                              >
                                <Eye size={16} />
                                {open ? 'Hide content' : 'View manga content'}
                                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="admin-muted">
                          <div>{s.creator?.displayName || '—'}</div>
                          <div style={{ fontSize: 12 }}>{s.creator?.email || '—'}</div>
                        </td>
                        <td>{s.payload?.explicit ? 'yes' : 'no'}</td>
                        <td>
                      <span
                        style={{
                          fontWeight: 900,
                          textTransform: 'lowercase',
                          color:
                            s.status === 'approved'
                              ? 'var(--primary)'
                              : s.status === 'pending'
                                ? 'var(--text-muted)'
                                : '#b91c1c',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                        <td>
                          <ModerationActions
                            s={s}
                            reasonById={reasonById}
                            setReasonById={setReasonById}
                            onDone={onReviewDone}
                            onPatched={onSubmissionPatched}
                            busy={reviewBusy}
                            setBusy={setReviewBusy}
                          />
                        </td>
                      </tr>
                      {open ? (
                        <tr>
                          <td colSpan={5}>
                            <MangaSubmissionContentPanel
                              submission={s}
                              drafts={drafts}
                              published={published}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminSectionPage>
  );
}
