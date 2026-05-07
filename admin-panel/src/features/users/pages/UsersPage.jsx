import { useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, KeyRound, Plus, Shield, UserCog } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { notify } from '../../../services/notify.js';
import { adminApi } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const ROLE_OPTIONS = ['reader', 'creator', 'support', 'ads', 'admin'];
const STATUS_OPTIONS = ['active', 'disabled'];

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'reader', status: 'active' });
  const [grant, setGrant] = useState({ email: '', userId: '', amount: 20, note: '' });
  const [markPaidId, setMarkPaidId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    adminApi
      .users()
      .then((rows) => {
        if (cancelled) return;
        setAllUsers(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load users');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rows = useMemo(() => {
    const all = allUsers;
    const q = query.trim().toLowerCase();
    return all.filter((u) => {
      // Don't show the currently logged-in admin in the list.
      if (currentUser?.id && String(u.id) === String(currentUser.id)) return false;
      if (!currentUser?.id && currentUser?.email && String(u.email || '').toLowerCase() === String(currentUser.email).toLowerCase()) return false;
      if (role !== 'all' && u.role !== role) return false;
      if (status !== 'all' && u.status !== status) return false;
      if (!q) return true;
      return (
        (u.email || '').toLowerCase().includes(q) ||
        ((u.displayName || u.name || '')).toLowerCase().includes(q)
      );
    });
  }, [allUsers, query, role, status, currentUser]);

  return (
    <AdminSectionPage
      title="Users"
      description="View and moderate user accounts."
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
                  placeholder="Search name or email..."
                />
              </div>
            </div>
            <div className="admin-grid-2" style={{ gap: 12 }}>
              <div>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Grant coins (test)
                </div>
                <div style={{ marginTop: 6, display: 'grid', gap: 8 }}>
                  <input
                    className="admin-input"
                    value={grant.email}
                    onChange={(e) => setGrant((g) => ({ ...g, email: e.target.value }))}
                    placeholder="user email (or fill userId)"
                  />
                  <div className="admin-grid-2" style={{ gap: 8 }}>
                    <input
                      className="admin-input"
                      value={grant.userId}
                      onChange={(e) => setGrant((g) => ({ ...g, userId: e.target.value }))}
                      placeholder="userId"
                    />
                    <input
                      className="admin-input"
                      inputMode="numeric"
                      value={grant.amount}
                      onChange={(e) => setGrant((g) => ({ ...g, amount: Number(e.target.value || 0) }))}
                      placeholder="coins"
                    />
                  </div>
                  <input
                    className="admin-input"
                    value={grant.note}
                    onChange={(e) => setGrant((g) => ({ ...g, note: e.target.value }))}
                    placeholder="note (optional)"
                  />
                  <button
                    className="admin-btn"
                    type="button"
                    onClick={() => {
                      adminApi
                        .grantCoins(grant)
                        .then((res) => {
                          notify.success(`Coins granted. Balance: ${res?.balance ?? '—'}`);
                          setGrant((g) => ({ ...g, note: '' }));
                        })
                        .catch((err) => notify.error(err?.message || 'Grant failed'));
                    }}
                  >
                    Grant
                  </button>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800, marginTop: 6 }}>
                    Mark purchase intent as paid (test)
                  </div>
                  <div className="admin-grid-2" style={{ gap: 8 }}>
                    <input
                      className="admin-input"
                      value={markPaidId}
                      onChange={(e) => setMarkPaidId(e.target.value)}
                      placeholder="purchase intent id (uuid)"
                    />
                    <button
                      className="admin-btn"
                      type="button"
                      onClick={() => {
                        adminApi
                          .markCoinPurchasePaid(markPaidId)
                          .then((res) => notify.success(`Marked paid. Credited ${res?.coins ?? ''} coins`))
                          .catch((err) => notify.error(err?.message || 'Mark paid failed'));
                      }}
                    >
                      Mark paid
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <button
                  className="admin-btn admin-btn--primary"
                  type="button"
                  onClick={() => setCreating(true)}
                >
                  <Plus size={16} />
                  Create user
                </button>
              </div>
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

      {creating ? (
        <div className="admin-surface">
          <div className="admin-surface__inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontWeight: 850 }}>Create user</div>
              <button className="admin-btn" type="button" onClick={() => setCreating(false)}>
                Close
              </button>
            </div>
            <div className="admin-grid-2" style={{ marginTop: 12 }}>
              <div>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Email
                </div>
                <div style={{ marginTop: 6 }}>
                  <input
                    className="admin-input"
                    value={newUser.email}
                    onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Display name
                </div>
                <div style={{ marginTop: 6 }}>
                  <input
                    className="admin-input"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser((u) => ({ ...u, displayName: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
              </div>
            </div>
            <div className="admin-grid-2" style={{ marginTop: 12 }}>
              <div>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Role
                </div>
                <div style={{ marginTop: 6 }}>
                  <select
                    className="admin-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                  >
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
                    value={newUser.status}
                    onChange={(e) => setNewUser((u) => ({ ...u, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button
                className="admin-btn admin-btn--primary"
                type="button"
                onClick={() => {
                  adminApi
                    .createUser(newUser)
                    .then(() => {
                      notify.success('User created (temporary password generated)');
                      setNewUser({ email: '', displayName: '', role: 'reader', status: 'active' });
                      setCreating(false);
                      setRefreshKey((k) => k + 1);
                    })
                    .catch((err) => notify.error(err?.message || 'Create failed'));
                }}
              >
                <Plus size={16} />
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                          adminApi
                            .updateUser(u.id, { role: e.target.value })
                            .then(() => setRefreshKey((k) => k + 1))
                            .catch((err) => notify.error(err?.message || 'Update failed'));
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
                          adminApi
                            .updateUser(u.id, { status: e.target.value })
                            .then(() => setRefreshKey((k) => k + 1))
                            .catch((err) => notify.error(err?.message || 'Update failed'));
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
                            adminApi
                              .updateUser(u.id, { role: 'admin' })
                              .then(() => setRefreshKey((k) => k + 1))
                              .catch((err) => notify.error(err?.message || 'Update failed'));
                          }}
                          title="Promote to admin"
                        >
                          <Shield size={16} />
                          Admin
                        </button>
                        <button
                          className="admin-btn"
                          type="button"
                          onClick={() => {
                            adminApi
                              .resetUserCredentials(u.id)
                              .then((res) => {
                                const pw = res?.temporaryPassword || '';
                                if (pw) notify.info(`Temporary password: ${pw}`);
                                else notify.success('Credentials reset');
                                setRefreshKey((k) => k + 1);
                              })
                              .catch((err) => notify.error(err?.message || 'Reset failed'));
                          }}
                          title="Reset credentials (temporary password)"
                        >
                          <KeyRound size={16} />
                          Reset
                        </button>
                        {u.status === 'active' ? (
                          <button
                            className="admin-btn admin-btn--danger"
                            type="button"
                            onClick={() => {
                              adminApi
                                .updateUser(u.id, { status: 'disabled' })
                                .then(() => setRefreshKey((k) => k + 1))
                                .catch((err) => notify.error(err?.message || 'Update failed'));
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
                              adminApi
                                .updateUser(u.id, { status: 'active' })
                                .then(() => setRefreshKey((k) => k + 1))
                                .catch((err) => notify.error(err?.message || 'Update failed'));
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
