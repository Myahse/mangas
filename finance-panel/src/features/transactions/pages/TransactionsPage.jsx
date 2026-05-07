import { useEffect, useMemo, useState } from 'react';
import { financeApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

function formatInstant(value) {
  try {
    if (!value) return '';
    return new Date(value).toLocaleString();
  } catch {
    return String(value || '');
  }
}

export function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    type: 'REVENUE',
    amount: '',
    currency: 'XOF',
    reference: '',
    note: '',
  }));

  const canSubmit = useMemo(() => {
    const amount = Number(form.amount);
    return Number.isFinite(amount) && amount !== 0 && String(form.currency || '').trim() && String(form.type || '').trim();
  }, [form]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await financeApi.listTransactions({ limit: 50 });
      setItems(Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []);
    } catch (e) {
      notify.error(String(e?.message || e || 'Failed to load transactions'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await financeApi.createTransaction({
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        reference: form.reference || null,
        note: form.note || null,
      });
      notify.success('Transaction created');
      setForm((p) => ({ ...p, amount: '', reference: '', note: '' }));
      await refresh();
    } catch (e) {
      notify.error(String(e?.message || e || 'Failed to create transaction'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Transactions</h2>
        <div className="finance-actions">
          <button className="finance-btn" type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="finance-grid-2">
        <div className="finance-surface">
          <div className="finance-surface__inner">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, marginBottom: 10 }}>New transaction</h3>
            <div className="finance-grid-2">
              <div>
                <label style={{ fontWeight: 900, fontSize: '.85rem' }}>Type</label>
                <select className="finance-select" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="REVENUE">Revenue</option>
                  <option value="PAYOUT">Payout</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 900, fontSize: '.85rem' }}>Currency</label>
                <select className="finance-select" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}>
                  <option value="XOF">XOF</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 900, fontSize: '.85rem' }}>Amount</label>
              <input className="finance-input" inputMode="decimal" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g. 12500" />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 900, fontSize: '.85rem' }}>Reference (optional)</label>
              <input className="finance-input" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Invoice ID / payout ref" />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 900, fontSize: '.85rem' }}>Note (optional)</label>
              <input className="finance-input" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Short description" />
            </div>

            <div style={{ marginTop: 14 }}>
              <button className="finance-btn finance-btn--primary" type="button" onClick={submit} disabled={!canSubmit || busy}>
                {busy ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>

        <div className="finance-surface">
          <div className="finance-surface__inner">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, marginBottom: 10 }}>Latest transactions</h3>
            {loading ? (
              <p className="finance-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="finance-muted">No transactions yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatInstant(tx.createdAt)}</td>
                        <td>{tx.type}</td>
                        <td>{tx.amount}</td>
                        <td>{tx.currency}</td>
                        <td>{tx.reference || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

