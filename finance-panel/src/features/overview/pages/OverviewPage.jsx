import { useEffect, useState } from 'react';
import { financeApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await financeApi.summary();
        if (!alive) return;
        setSummary(res);
      } catch (e) {
        notify.error(String(e?.message || e || 'Failed to load summary'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalPayouts = summary?.totalPayouts ?? 0;
  const balance = summary?.balance ?? 0;
  const transactionCount = summary?.transactionCount ?? 0;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Overview</h2>
      </div>

      <div className="finance-grid-3">
        <div className="finance-surface finance-kpi">
          <div className="finance-kpi__label">Total revenue</div>
          <div className="finance-kpi__value">{loading ? '—' : totalRevenue}</div>
        </div>
        <div className="finance-surface finance-kpi">
          <div className="finance-kpi__label">Total payouts</div>
          <div className="finance-kpi__value">{loading ? '—' : totalPayouts}</div>
        </div>
        <div className="finance-surface finance-kpi">
          <div className="finance-kpi__label">Balance</div>
          <div className="finance-kpi__value">{loading ? '—' : balance}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }} className="finance-surface">
        <div className="finance-surface__inner">
          <div className="section-header" style={{ marginBottom: 10 }}>
            <h3 className="section-title" style={{ fontSize: '1.05rem' }}>
              Quick stats
            </h3>
          </div>
          <p className="finance-muted">
            {loading ? 'Loading…' : `Transactions recorded: ${transactionCount}`}
          </p>
        </div>
      </div>
    </div>
  );
}

