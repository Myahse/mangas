import { useEffect, useState } from 'react';
import { BookOpen, ScrollText, Users } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { adminApi } from '../../../services/api.js';

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
  const [summary, setSummary] = useState(null);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState('');
  const [flags, setFlags] = useState(null);
  const [flagBusy, setFlagBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError('');
    Promise.all([adminApi.summary(), adminApi.audits(), adminApi.featureFlags()])
      .then(([s, a, f]) => {
        if (cancelled) return;
        setSummary(s);
        setAudits(Array.isArray(a) ? a.slice(0, 12) : []);
        setFlags(f || null);
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
    <AdminSectionPage
      title="Overview"
      description="Quick snapshot of platform activity."
    >
      {error ? (
        <div className="admin-surface">
          <div className="admin-surface__inner">
            <div className="admin-muted">{error}</div>
          </div>
        </div>
      ) : null}
      <div className="admin-grid-3">
        <StatCard
          icon={Users}
          label="Users"
          value={summary ? summary.usersTotal : '—'}
          hint="Active + disabled accounts."
        />
        <StatCard
          icon={ScrollText}
          label="Manga requests"
          value={
            summary ? `${summary.requestsNew} new / ${summary.requestsTotal}` : '—'
          }
          hint="Triage new requests and mark as resolved."
        />
        <StatCard
          icon={BookOpen}
          label="Content"
          value={
            summary ? `${summary.mangasPublished} published / ${summary.mangasTotal}` : '—'
          }
          hint="Drafts are visible only to admins."
        />
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Feature toggles</div>
          {!flags ? (
            <div className="admin-muted">Loading…</div>
          ) : (
            <div className="admin-grid-2" style={{ gap: 12 }}>
              {[
                { key: 'coins.rewards.enabled', label: 'Daily rewards (coins)' },
                { key: 'coins.payments.enabled', label: 'Coin payments (future)' },
              ].map((row) => (
                <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 850 }}>{row.label}</div>
                    <div className="admin-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {row.key}
                    </div>
                  </div>
                  <button
                    className={`admin-btn${flags[row.key] ? ' admin-btn--primary' : ''}`}
                    type="button"
                    disabled={flagBusy}
                    onClick={() => {
                      setFlagBusy(true);
                      adminApi
                        .updateFeatureFlag(row.key, !Boolean(flags[row.key]))
                        .then((next) => setFlags(next || null))
                        .catch((e) => setError(e?.message || 'Failed to update flag'))
                        .finally(() => setFlagBusy(false));
                    }}
                  >
                    {flags[row.key] ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
