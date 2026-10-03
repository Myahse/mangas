import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiAssetUrl, creatorApi } from '../../services/api';
import { notify } from '../../services/notify';
import '../publications/PublicationsPage.css';

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function submissionStatus(s) {
  return String(s?.status || 'pending').trim().toLowerCase();
}

function pagePreviewUrl(page) {
  if (!page) return '';
  if (page.url) return apiAssetUrl(page.url);
  const key = page.r2Key || page.key;
  if (key) return apiAssetUrl(`/api/v1/storage/${String(key).replace(/^\//, '')}`);
  return '';
}

function pickThumbSquareUrl(payload) {
  const p = payload || {};
  // Accept multiple possible shapes depending on backend evolution.
  return (
    p?.thumbnails?.square?.url ||
    p?.thumbnails?.squareUrl ||
    p?.thumbnailSquareUrl ||
    p?.thumbSquareUrl ||
    p?.thumbnail?.square?.url ||
    ''
  );
}

export default function PublicationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [episodes, setEpisodes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const tab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tab') || 'episodes').toLowerCase() === 'series' ? 'series' : 'episodes';
  }, [location.search]);

  const loadData = async () => {
    const [eps, subs] = await Promise.all([creatorApi.listPublished(), creatorApi.listMySubmissions()]);
    setEpisodes(Array.isArray(eps) ? eps : []);
    setSubmissions(Array.isArray(subs) ? subs : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        void refreshKey;
        await loadData();
      } catch (err) {
        if (!cancelled) {
          notify.error(`Impossible de charger les publications. ${(err && err.message) || ''}`.trim());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const counts = useMemo(() => {
    const pending = submissions.filter((s) => submissionStatus(s) === 'pending').length;
    const approved = submissions.filter((s) => submissionStatus(s) === 'approved').length;
    const rejected = submissions.filter((s) => {
      const st = submissionStatus(s);
      return st === 'rejected' || st === 'resubmit';
    }).length;
    return { pending, approved, rejected, total: submissions.length };
  }, [submissions]);

  return (
    <div className="pub container">
      <h1 className="pub__title">Publications</h1>
      <p className="pub__lead">Suivez vos épisodes publiés et le statut de vos séries.</p>

      <div className="pub__actions pub__actions--hero">
        <Link to="/episodes" className="pub__btn pub__btn--primary pub__btn--publish-cta">
          Publier un épisode
        </Link>
      </div>

      <div className="pub__actions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`pub__btn${tab === 'episodes' ? ' pub__btn--primary' : ''}`}
          onClick={() => navigate('/publications?tab=episodes')}
        >
          Épisodes
        </button>
        <button
          type="button"
          className={`pub__btn${tab === 'series' ? ' pub__btn--primary' : ''}`}
          onClick={() => navigate('/publications?tab=series')}
        >
          Séries · {counts.pending} en attente · {counts.approved} acceptées
        </button>
        <button
          type="button"
          className="pub__btn"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
        >
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="pub__empty">Chargement…</div>
      ) : tab === 'episodes' ? (
        episodes.length === 0 ? (
          <div className="pub__empty">
            Aucun épisode publié pour le moment.
            <div style={{ marginTop: 12 }}>
              <Link to="/episodes" className="pub__btn pub__btn--primary">Publier un épisode</Link>
            </div>
          </div>
        ) : (
          <div className="pub__grid">
            {episodes.map((ep) => (
              <div key={ep.id} className="pub__card">
                <div className="pub__head">
                  <div>
                    <div className="pub__series">{ep.seriesTitle}</div>
                    <div className="pub__episode">{ep.episodeTitle}</div>
                    <div className="pub__meta">
                      Publié: {formatWhen(ep.publishedAt)}
                      {ep.scheduledFor ? ` · Programmé: ${ep.scheduledFor}` : ''}
                    </div>
                  </div>
                  <div className="pub__stats" title="Comptées depuis l’app lecteur uniquement">
                    <div className="pub__stat">
                      <span>Vues</span>
                      <strong>{ep.stats?.views ?? 0}</strong>
                    </div>
                    <div className="pub__stat">
                      <span>Likes</span>
                      <strong>{ep.stats?.likes ?? 0}</strong>
                    </div>
                    <div className="pub__stat">
                      <span>Commentaires</span>
                      <strong>{ep.stats?.comments ?? (ep.comments?.length ?? 0)}</strong>
                    </div>
                  </div>
                </div>

                {ep.creatorNote ? <div className="pub__note">{ep.creatorNote}</div> : null}

                {Array.isArray(ep.images) && ep.images.length > 0 ? (
                  <div className="pub__page-strip" aria-label="Pages de l'épisode">
                    {ep.images.slice(0, 10).map((img, idx) => {
                      const src = pagePreviewUrl(img);
                      return src ? (
                        <img key={`${ep.id}-pg-${idx}`} src={src} alt={`Page ${idx + 1}`} loading="lazy" />
                      ) : null;
                    })}
                    {ep.images.length > 10 ? (
                      <span className="pub__page-strip-more">+{ep.images.length - 10}</span>
                    ) : null}
                  </div>
                ) : null}

                {(ep.comments ?? []).length > 0 ? (
                <div className="pub__comments">
                  <div className="pub__comments-title">Commentaires lecteurs</div>

                  {(ep.comments ?? []).slice(0, 5).map((c) => (
                    <div key={c.id} className="pub__comment">
                      <div className="pub__comment-meta">
                        <strong>{c.author}</strong> · {formatWhen(c.createdAt)}
                      </div>
                      <div className="pub__comment-text">{c.text}</div>
                    </div>
                  ))}
                  {(ep.comments ?? []).length > 5 ? <div className="pub__more">…</div> : null}
                </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : submissions.length === 0 ? (
        <div className="pub__empty">Aucune série envoyée pour le moment. Créez une série dans l’onglet SÉRIES.</div>
      ) : (
        <div className="pub__grid">
          {submissions.map((s) => {
            const st = submissionStatus(s);
            const statusLabel =
              st === 'approved'
                ? 'Acceptée'
                : st === 'pending'
                  ? 'En attente'
                  : st === 'resubmit'
                    ? 'À corriger'
                    : 'Refusée';
            return (
              <div key={s.id} className="pub__card">
                <div className="pub__head">
                  <div className="pub__left">
                    <div className="pub__thumb pub__thumb--square" aria-hidden="true">
                      {pickThumbSquareUrl(s.payload) ? (
                        <img src={apiAssetUrl(pickThumbSquareUrl(s.payload))} alt="" />
                      ) : (
                        <div className="pub__thumb-ph" />
                      )}
                    </div>
                    <div className="pub__series">Série</div>
                    <div className="pub__episode">{s.payload?.title || 'Sans titre'}</div>
                    <div className="pub__meta">
                      Statut: <strong>{statusLabel}</strong> · Envoyée: {formatWhen(s.createdAt)}
                      {s.moderation?.reviewedAt ? ` · Revue: ${formatWhen(s.moderation.reviewedAt)}` : ''}
                    </div>
                    {s.moderation?.reason ? <div className="pub__note">Motif: {s.moderation.reason}</div> : null}
                  </div>
                  <div className="pub__actions" style={{ marginTop: 0 }}>
                    <Link
                      to={`/episodes?seriesTitle=${encodeURIComponent(s.payload?.title || '')}`}
                      className="pub__btn pub__btn--primary"
                    >
                      Publier un épisode
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

