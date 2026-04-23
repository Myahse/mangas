import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Shield, UserCog } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { mockDb } from '../../../lib/mockDb.js';
import { notify } from '../../../services/notify.js';

const ROLE_OPTIONS = ['reader', 'creator', 'admin'];
const STATUS_OPTIONS = ['active', 'disabled'];

export function UsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => {
    const all = mockDb.listUsers();
    const q = query.trim().toLowerCase();
    return all.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (status !== 'all' && u.status !== status) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role, status, refreshKey]);

  return (
    <AdminSectionPage
      title="Users"
      description="View and moderate user accounts (local mock data)."
    >
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
                  placeholder="Search name or email..."
                />
              </div>
            </div>
            <div className="admin-grid-2" style={{ gap: 12 }}>
              <div>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Role
                </div>
                <div style={{ marginTop: 6 }}>
                  <select
                    className="admin-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="all">All</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
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
                    <option value="all">All</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          {rows.length === 0 ? (
            <div className="admin-muted">No users match your filters.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th style={{ width: 160 }}>Role</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th style={{ width: 200, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
      {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 760 }}>
                        {u.displayName || u.name}
                      </div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {u.email} • created {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <select
                        className="admin-select"
                        value={u.role}
                        onChange={(e) => {
                          mockDb.updateUser(u.id, { role: e.target.value });
                          setRefreshKey((k) => k + 1);
                        }}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="admin-select"
                        value={u.status}
                        onChange={(e) => {
                          mockDb.updateUser(u.id, { status: e.target.value });
                          setRefreshKey((k) => k + 1);
                        }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-btn"
                          type="button"
                          onClick={() => {
                            mockDb.updateUser(u.id, { role: 'admin' });
                            setRefreshKey((k) => k + 1);
                          }}
                          title="Promote to admin"
                        >
                          <Shield size={16} />
                          Admin
                        </button>
                        {u.status === 'active' ? (
                          <button
                            className="admin-btn admin-btn--danger"
                            type="button"
                            onClick={() => {
                              mockDb.updateUser(u.id, { status: 'disabled' });
                              setRefreshKey((k) => k + 1);
                            }}
                          >
                            <Ban size={16} />
                            Disable
                          </button>
                        ) : (
                          <button
                            className="admin-btn admin-btn--primary"
                            type="button"
                            onClick={() => {
                              mockDb.updateUser(u.id, { status: 'active' });
                              setRefreshKey((k) => k + 1);
                            }}
                          >
                            <CheckCircle2 size={16} />
                            Enable
                          </button>
                        )}
                        <button
                          className="admin-btn"
                          type="button"
                          onClick={() => notify.info(`User id: ${u.id}`)}
                        >
                          <UserCog size={16} />
                          Details
                        </button>
                      </div>
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
