import { BarChart3 } from 'lucide-react';
import { mockDb } from '../../../lib/mockDb.js';

export function OverviewPage() {
  const summary = mockDb.getSummary();

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
          <div className="admin-kpi__value">{summary.heroAdsTotal}</div>
          <div className="admin-muted">{summary.heroAdsActive} active</div>
        </div>
        <div className="admin-surface admin-kpi">
          <div className="admin-kpi__label">Notifications</div>
          <div className="admin-kpi__value">{summary.notificationsTotal}</div>
          <div className="admin-muted">{summary.pushQueued} push queued</div>
        </div>
        <div className="admin-surface admin-kpi">
          <div className="admin-kpi__label">System notices</div>
          <div className="admin-kpi__value">{summary.systemNoticesTotal}</div>
          <div className="admin-muted">{summary.noticesActive} active</div>
        </div>
      </div>
    </div>
  );
}

