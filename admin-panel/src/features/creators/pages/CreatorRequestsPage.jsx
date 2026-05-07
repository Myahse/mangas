import { useEffect, useMemo, useRef, useState } from 'react';
import { XCircle } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { adminApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches?.[0];
  const clientX = t ? t.clientX : e.clientX;
  const clientY = t ? t.clientY : e.clientY;
  const scaleX = rect.width ? canvas.width / rect.width : 1;
  const scaleY = rect.height ? canvas.height / rect.height : 1;
  return {
    x: ((clientX ?? 0) - rect.left) * scaleX,
    y: ((clientY ?? 0) - rect.top) * scaleY,
  };
}

export function CreatorRequestsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [reasonById, setReasonById] = useState({});
  const [allRows, setAllRows] = useState([]);
  const [error, setError] = useState('');

  const [contractModal, setContractModal] = useState(null); // { request, loading, contract, err, accept, saving, sending, signedOk, sentOk }
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError('');
    adminApi
      .creatorRequests()
      .then((rows) => {
        if (cancelled) return;
        setAllRows(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load creator requests');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rows = useMemo(() => {
    const all = allRows;
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
  }, [allRows, status, query]);

  const closeModal = () => {
    setContractModal(null);
    setHasInk(false);
    isDrawingRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [contractModal?.request?.id]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const startDraw = (e) => {
    if (!contractModal) return;
    const isSigned = String(contractModal?.contract?.status || '').toLowerCase() === 'fully_signed';
    if (isSigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const pos = getPos(e, canvas);
    lastPosRef.current = pos;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
      setHasInk(true);
    }
    e.preventDefault?.();
  };

  const moveDraw = (e) => {
    if (!contractModal) return;
    const isSigned = String(contractModal?.contract?.status || '').toLowerCase() === 'fully_signed';
    if (isSigned) return;
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const next = getPos(e, canvas);
    const last = lastPosRef.current;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPosRef.current = next;
    setHasInk(true);
    e.preventDefault?.();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
  };

  return (
    <AdminSectionPage
      title="Creator requests"
      description="Open Contract to review signatures. When the contract is fully signed, use Send PDF to email the contract and finalize approval (creator credentials are sent by email)."
    >
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
                  (() => {
                    const isArchived = r.status !== 'pending';
                    return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>{r.displayName}</div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {r.email}
                        {r.creatorEmail ? ` → ${r.creatorEmail}` : ''}
                        {' • '}
                        {new Date(r.createdAt).toLocaleString()}
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
                          placeholder={isArchived ? 'Archived' : 'Optional reason...'}
                          style={{ maxWidth: 240 }}
                          disabled={isArchived}
                        />
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => {
                              setContractModal({
                                request: r,
                                loading: true,
                                contract: null,
                                err: '',
                                accept: false,
                                saving: false,
                                sending: false,
                                signedOk: false,
                                sentOk: false,
                              });
                              adminApi
                                .getCreatorContractForRequest(r.id)
                                .then((c) => {
                                  setContractModal((m) => (m ? { ...m, loading: false, contract: c || null } : m));
                                })
                                .catch((e) => {
                                  setContractModal((m) => (m ? { ...m, loading: false, err: e?.message || 'Failed to load contract' } : m));
                                });
                            }}
                          >
                            Contract
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            disabled={isArchived}
                            onClick={() => {
                              adminApi
                                .reviewCreatorRequest(r.id, {
                                  decision: 'rejected',
                                  reason: reasonById[r.id] || 'Rejected by admin',
                                })
                                .then(() => setRefreshKey((k) => k + 1))
                                .catch((err) => notify.error(err?.message || 'Review failed'));
                            }}
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {contractModal ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="admin-surface"
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="admin-surface__inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Contract — {contractModal.request.displayName}
              </div>
              <button type="button" className="admin-btn" onClick={closeModal}>
                Close
              </button>
            </div>

            <div className="admin-surface__inner" style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 12 }}>
              {contractModal.err ? <div className="admin-muted">{contractModal.err}</div> : null}
              {contractModal.loading ? <div className="admin-muted">Loading…</div> : null}

              {contractModal.contract ? (
                <>
                  <div className="admin-muted" style={{ fontSize: 12 }}>
                    Status: <strong>{contractModal.contract.status}</strong>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>Contract</div>
                    <div
                      style={{ background: '#fff', color: '#111', padding: '16px 18px' }}
                      dangerouslySetInnerHTML={{ __html: contractModal.contract.contractHtml || '' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>Signatures</div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                        alignItems: 'start',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                          Creator
                        </div>
                        {String(contractModal.contract.signatureData || '').trim() ? (
                          <img
                            src={contractModal.contract.signatureData}
                            alt="Creator signature"
                            style={{ display: 'block', maxWidth: '100%', width: '100%', height: 'auto', background: '#fff' }}
                          />
                        ) : (
                          <div className="admin-muted">No creator signature yet.</div>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                          Admin
                        </div>
                        <div
                          style={{
                            overflow: 'hidden',
                            background: '#fff',
                            touchAction: 'none',
                            opacity: String(contractModal.contract.status || '').toLowerCase() === 'fully_signed' ? 0.9 : 1,
                            borderBottom: '1px solid rgba(0,0,0,0.25)',
                          }}
                        >
                          <canvas
                            ref={canvasRef}
                            width={560}
                            height={190}
                            onMouseDown={startDraw}
                            onMouseMove={moveDraw}
                            onMouseUp={endDraw}
                            onMouseLeave={endDraw}
                            onTouchStart={startDraw}
                            onTouchMove={moveDraw}
                            onTouchEnd={endDraw}
                            style={{
                              display: 'block',
                              width: '100%',
                              height: 'auto',
                              pointerEvents: String(contractModal.contract.status || '').toLowerCase() === 'fully_signed' ? 'none' : 'auto',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={contractModal.accept}
                          onChange={(e) => setContractModal((m) => (m ? { ...m, accept: e.target.checked } : m))}
                          disabled={String(contractModal.contract.status || '').toLowerCase() === 'fully_signed'}
                        />
                        <span className="admin-muted" style={{ fontSize: 12 }}>
                          I accept (admin)
                        </span>
                      </label>
                      <button type="button" className="admin-btn" onClick={clearSignature} disabled={String(contractModal.contract.status || '').toLowerCase() === 'fully_signed'}>
                        Clear
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        disabled={
                          contractModal.saving ||
                          !contractModal.accept ||
                          !hasInk ||
                          String(contractModal.contract.status || '').toLowerCase() !== 'creator_signed'
                        }
                        onClick={() => {
                          const canvas = canvasRef.current;
                          const png = canvas ? canvas.toDataURL('image/png') : '';
                          setContractModal((m) => (m ? { ...m, saving: true } : m));
                          adminApi
                            .adminSignCreatorContract(contractModal.request.id, {
                              accept: true,
                              signatureData: png,
                            })
                            .then((next) => {
                              setContractModal((m) => (m ? { ...m, saving: false, contract: next, signedOk: true } : m));
                              notify.success?.('Admin signed');
                            })
                            .catch((e) => {
                              setContractModal((m) => (m ? { ...m, saving: false } : m));
                              notify.error(e?.message || 'Admin sign failed');
                            });
                        }}
                      >
                        {contractModal.saving ? 'Signing…' : 'Sign (Admin)'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={contractModal.sending || String(contractModal.contract.status || '').toLowerCase() !== 'fully_signed'}
                        onClick={() => {
                          setContractModal((m) => (m ? { ...m, sending: true } : m));
                          adminApi
                            .sendCreatorContractPdf(contractModal.request.id)
                            .then(() => {
                              setContractModal((m) => (m ? { ...m, sending: false, sentOk: true } : m));
                              notify.success?.('Contract sent — request approved');
                              setRefreshKey((k) => k + 1);
                            })
                            .catch((e) => {
                              setContractModal((m) => (m ? { ...m, sending: false } : m));
                              notify.error(e?.message || 'Send PDF failed');
                            });
                        }}
                      >
                        {contractModal.sending ? 'Sending…' : 'Send PDF & approve'}
                      </button>
                    </div>

                    {contractModal.sentOk ? (
                      <div className="admin-muted">PDF sent; creator request approved (refresh the list).</div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AdminSectionPage>
  );
}

