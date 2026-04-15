import { ImagePlus, Pause, Play, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { mockDb } from '../../../lib/mockDb.js';

const emptyForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaLabel: 'Learn more',
  ctaUrl: '/',
  status: 'paused',
  startsAt: '',
  endsAt: '',
};

export function HeroAdsPage() {
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);
  const ads = useMemo(() => mockDb.listHeroAds(), [refreshKey]);

  function onCreate(e) {
    e.preventDefault();
    mockDb.createHeroAd(form);
    setForm(emptyForm);
    setRefreshKey((k) => k + 1);
  }

  function toggleActive(row) {
    mockDb.updateHeroAd(row.id, { status: row.status === 'active' ? 'paused' : 'active' });
    setRefreshKey((k) => k + 1);
  }

  function onDelete(id) {
    mockDb.deleteHeroAd(id);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">
          <ImagePlus size={18} /> Hero ads
        </h1>
      </div>

      <div className="admin-grid-2">
        <section className="admin-surface">
          <div className="admin-surface__inner">
            <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 10 }}>Create ad</h2>
            <form onSubmit={onCreate} className="admin-actions" style={{ flexDirection: 'column' }}>
              <div className="admin-grid-2">
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Title
                  </div>
                  <input
                    className="admin-input"
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    placeholder="e.g. Premium Week"
                  />
                </label>
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Subtitle
                  </div>
                  <input
                    className="admin-input"
                    value={form.subtitle}
                    onChange={(e) => setForm((s) => ({ ...s, subtitle: e.target.value }))}
                    placeholder="Short supporting text"
                  />
                </label>
              </div>

              <label>
                <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Image URL
                </div>
                <input
                  className="admin-input"
                  value={form.imageUrl}
                  onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <div className="admin-grid-2">
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    CTA label
                  </div>
                  <input
                    className="admin-input"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((s) => ({ ...s, ctaLabel: e.target.value }))}
                  />
                </label>
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    CTA URL / deep link
                  </div>
                  <input
                    className="admin-input"
                    value={form.ctaUrl}
                    onChange={(e) => setForm((s) => ({ ...s, ctaUrl: e.target.value }))}
                    placeholder="/home or https://..."
                  />
                </label>
              </div>

              <div className="admin-grid-2">
                <label>
                  <div className="admin-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                    Status
                  </div>
                  <select
                    className="admin-select"
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                  >
                    <option value="paused">Paused</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="ended">Ended</option>
                  </select>
                </label>
                <div className="admin-actions" style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <button className="admin-btn admin-btn--primary" type="submit">
                    Create
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="admin-surface">
          <div className="admin-surface__inner">
            <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 10 }}>Existing</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>{row.title}</div>
                      <div className="admin-muted" style={{ fontSize: 12 }}>
                        {row.subtitle || '—'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 900, color: row.status === 'active' ? 'var(--primary)' : undefined }}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-btn" type="button" onClick={() => toggleActive(row)}>
                          {row.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                          {row.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          className="admin-btn admin-btn--danger"
                          type="button"
                          onClick={() => onDelete(row.id)}
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ads.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="admin-muted" style={{ padding: 14 }}>
                      No ads yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

