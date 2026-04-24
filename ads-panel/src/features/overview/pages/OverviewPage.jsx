import { BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adsApi } from '../../../services/api.js';

export function OverviewPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    adsApi
      .summary()
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load overview');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">
          <BarChart3 size={18} /> Overview
        </h1>
      </div>

      <div className="admin-grid-3">
        <div className="admin-surface admin-kpi">
          <div className="admin-kpi__label">Hero ads</div>
          <div className="admin-kpi__value">{summary ? summary.heroAdsTotal : '—'}</div>
          <div className="admin-muted">{summary ? summary.heroAdsActive : '—'} active</div>
        </div>
        <div className="admin-surface admin-kpi">
          <div className="admin-kpi__label">Notifications</div>
          <div className="admin-kpi__value">{summary ? summary.notificationsTotal : '—'}</div>
          <div className="admin-muted">{summary ? summary.pushQueued : '—'} push queued</div>
        </div>
        <div className="admin-surface admin-kpi">
          <div className="admin-kpi__label">System notices</div>
          <div className="admin-kpi__value">{summary ? summary.systemNoticesTotal : '—'}</div>
          <div className="admin-muted">{summary ? summary.noticesActive : '—'} active</div>
        </div>
      </div>

      {error ? (
        <div className="admin-surface" style={{ marginTop: 14 }}>
          <div className="admin-surface__inner">
            <div className="admin-muted">{error}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

