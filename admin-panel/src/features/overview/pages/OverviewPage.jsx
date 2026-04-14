import { BookOpen, ScrollText, Users } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { mockDb } from '../../../lib/mockDb.js';

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="admin-surface admin-kpi">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            background: 'rgba(255, 106, 0, 0.12)',
            border: '1px solid rgba(255, 106, 0, 0.18)',
            color: 'var(--primary)',
          }}
        >
          <Icon size={18} />
        </span>
        <div>
          <div className="admin-kpi__label">{label}</div>
          <div className="admin-kpi__value">{value}</div>
        </div>
      </div>
      {hint ? (
        <div className="admin-muted" style={{ marginTop: 10, fontSize: 13 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function OverviewPage() {
  const summary = mockDb.getSummary();
  const audits = mockDb.listAudits().slice(0, 12);

  return (
    <AdminSectionPage
      title="Overview"
      description="Quick snapshot of platform activity (local mock data for now)."
    >
      <div className="admin-grid-3">
        <StatCard
          icon={Users}
          label="Users"
          value={summary.usersTotal}
          hint="Active + disabled accounts."
        />
        <StatCard
          icon={ScrollText}
          label="Manga requests"
          value={`${summary.requestsNew} new / ${summary.requestsTotal}`}
          hint="Triage new requests and mark as resolved."
        />
        <StatCard
          icon={BookOpen}
          label="Content"
          value={`${summary.mangasPublished} published / ${summary.mangasTotal}`}
          hint="Drafts are visible only to admins."
        />
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Recent activity</div>
          {audits.length === 0 ? (
            <div className="admin-muted">No activity yet.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 180 }}>When</th>
                  <th style={{ width: 180 }}>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td className="admin-muted">
                      {new Date(a.at).toLocaleString()}
                    </td>
                    <td>{a.action}</td>
                    <td className="admin-muted">
                      <code style={{ color: 'inherit' }}>
                        {JSON.stringify(a.payload)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminSectionPage>
  );
}
