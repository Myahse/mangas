import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdminSectionPage } from '../../../pages/AdminSectionPage.jsx';
import { notify } from '../../../services/notify.js';
import { adminApi } from '../../../services/api.js';

const STATUS_OPTIONS = ['draft', 'published', 'archived'];

export function ContentPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [create, setCreate] = useState({ title: '', slug: '', status: 'draft' });
  const [allRows, setAllRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    adminApi
      .mangas()
      .then((rows) => {
        if (cancelled) return;
        setAllRows(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load mangas');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rows = useMemo(() => {
    const all = allRows;
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) => m.title.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, refreshKey]);

  return (
    <AdminSectionPage
      title="Content"
      description="Manage mangas (create, publish, edit, delete)."
      right={
        <button
          className="admin-btn admin-btn--primary"
          type="button"
          onClick={() => {
            adminApi
              .createManga(create)
              .then((created) => {
                setCreate({ title: '', slug: '', status: 'draft' });
                setRefreshKey((k) => k + 1);
                notify.success(`Manga created: ${created.title}`);
              })
              .catch((err) => notify.error(err?.message || 'Create failed'));
          }}
          disabled={!create.title.trim()}
        >
          <Plus size={16} />
          Create manga
        </button>
      }
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
                Title
              </div>
              <div style={{ marginTop: 6 }}>
                <input
                  className="admin-input"
                  value={create.title}
                  onChange={(e) =>
                    setCreate((c) => ({ ...c, title: e.target.value }))
                  }
                  placeholder="Manga title"
                />
              </div>
            </div>
            <div className="admin-grid-2" style={{ gap: 12 }}>
              <div>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Slug (optional)
                </div>
                <div style={{ marginTop: 6 }}>
                  <input
                    className="admin-input"
                    value={create.slug}
                    onChange={(e) =>
                      setCreate((c) => ({ ...c, slug: e.target.value }))
                    }
                    placeholder="akwa-origins"
                  />
                </div>
              </div>
              <div>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Status
                </div>
                <div style={{ marginTop: 6 }}>
                  <select
                    className="admin-select"
                    value={create.status}
                    onChange={(e) =>
                      setCreate((c) => ({ ...c, status: e.target.value }))
                    }
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
          </div>
        </div>
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
            Search
          </div>
          <div style={{ marginTop: 6 }}>
            <input
              className="admin-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or slug..."
            />
          </div>
        </div>
      </div>

      <div className="admin-surface">
        <div className="admin-surface__inner">
          {rows.length === 0 ? (
            <div className="admin-muted">No mangas match your search.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th style={{ width: 220 }}>Slug</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th style={{ width: 190, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 760 }}>{m.title}</div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {m.id} • {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="admin-muted">
                      <code style={{ color: 'inherit' }}>{m.slug}</code>
                    </td>
                    <td>
                      <select
                        className="admin-select"
                        value={m.status}
                        onChange={(e) => {
                          adminApi
                            .updateManga(m.id, { status: e.target.value })
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
                          className="admin-btn admin-btn--danger"
                          type="button"
                          onClick={() => {
                            if (
                              confirm(`Delete manga “${m.title}”? This cannot be undone.`)
                            ) {
                              adminApi
                                .deleteManga(m.id)
                                .then(() => setRefreshKey((k) => k + 1))
                                .catch((err) => notify.error(err?.message || 'Delete failed'));
                            }
                          }}
                        >
                          <Trash2 size={16} />
                          Delete
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
