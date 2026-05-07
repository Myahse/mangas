import { useEffect, useState } from 'react';
import { financeApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

export function ReportsPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await financeApi.summary();
        if (alive) setSummary(res);
      } catch (e) {
        notify.error(String(e?.message || e || 'Failed to load report data'));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="finance-surface">
      <div className="finance-surface__inner">
        <div className="section-header">
          <h2 className="section-title">Reports</h2>
        </div>
        <p className="finance-muted">
          This page is wired to the backend. Next we can add date filters, CSV export, and per-creator payout breakdowns.
        </p>
        <div style={{ marginTop: 14 }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontWeight: 800, fontSize: '.85rem', color: 'var(--text)' }}>
            {JSON.stringify(summary, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

