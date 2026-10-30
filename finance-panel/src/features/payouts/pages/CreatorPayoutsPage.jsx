import { useEffect, useState } from 'react';
import { financeApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

const METHOD_LABEL = { wave: 'Wave', orange_money: 'Orange Money', mtn_money: 'MTN MoMo', moov_money: 'Moov Money' };

function formatInstant(value) {
  try {
    if (!value) return '';
    return new Date(value).toLocaleString();
  } catch {
    return String(value || '');
  }
}

/**
 * Creator payout requests: send the money by mobile money outside the platform, then mark the request
 * paid with the transfer reference (it is booked as a PAYOUT transaction) — or reject it.
 */
export function CreatorPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('requested');
  const [refs, setRefs] = useState({});
  const [busyId, setBusyId] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const res = await financeApi.listCreatorPayouts({ status });
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      notify.error(String(e?.message || e || 'Failed to load payouts'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function markPaid(p) {
    const reference = String(refs[p.id] || '').trim();
    if (!reference) {
      notify.error('Enter the mobile-money transfer reference first');
      return;
    }
    setBusyId(p.id);
    try {
      await financeApi.markCreatorPayoutPaid(p.id, reference);
      notify.success(`Paid ${p.amountXof} XOF to ${p.creatorEmail}`);
      await refresh();
    } catch (e) {
      notify.error(String(e?.message || e || 'Failed to mark paid'));
    } finally {
      setBusyId('');
    }
  }

  async function reject(p) {
    const note = window.prompt('Reason for rejecting (shown to the creator):', '');
    if (note === null) return;
    setBusyId(p.id);
    try {
      await financeApi.rejectCreatorPayout(p.id, note);
      notify.success('Request rejected');
      await refresh();
    } catch (e) {
      notify.error(String(e?.message || e || 'Failed to reject'));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Creator payouts</h2>
        <div className="finance-actions">
          <select className="finance-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="requested">Waiting</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
          <button className="finance-btn" type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="finance-surface">
        <div className="finance-surface__inner">
          <p className="finance-muted" style={{ marginBottom: 12 }}>
            Send the amount by mobile money to the number shown, then enter the transfer reference and mark the request paid.
          </p>
          {loading ? (
            <p className="finance-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="finance-muted">No payout requests.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th>Creator</th>
                    <th>Amount</th>
                    <th>Pay to</th>
                    <th>Status</th>
                    <th>Reference</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td>{formatInstant(p.createdAt)}</td>
                      <td>{p.creatorEmail}</td>
                      <td>{p.amountXof} XOF</td>
                      <td>{METHOD_LABEL[p.method] || p.method} · {p.phone}</td>
                      <td>{p.status}{p.note ? ` (${p.note})` : ''}</td>
                      <td>
                        {p.status === 'requested' ? (
                          <input
                            className="finance-input"
                            value={refs[p.id] || ''}
                            onChange={(e) => setRefs((m) => ({ ...m, [p.id]: e.target.value }))}
                            placeholder="Transfer ref"
                            aria-label={`Transfer reference for ${p.creatorEmail}`}
                          />
                        ) : (p.reference || '')}
                      </td>
                      <td>
                        {p.status === 'requested' ? (
                          <div className="finance-actions">
                            <button className="finance-btn finance-btn--primary" type="button" disabled={busyId === p.id} onClick={() => markPaid(p)}>
                              Mark paid
                            </button>
                            <button className="finance-btn" type="button" disabled={busyId === p.id} onClick={() => reject(p)}>
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
