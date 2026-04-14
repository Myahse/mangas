import { useMemo, useState } from 'react';
import { addPublishedEpisodeComment, loadPublishedEpisodes, togglePublishedEpisodeLike, updatePublishedEpisode } from '../episodes/storage';
import '../publications/PublicationsPage.css';

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function PublicationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [commentTextById, setCommentTextById] = useState({});

  const episodes = useMemo(() => {
    void refreshKey;
    return loadPublishedEpisodes();
  }, [refreshKey]);

  return (
    <div className="pub container">
      <h1 className="pub__title">Publications</h1>
      <p className="pub__lead">Vos épisodes publiés (demo). Les stats seront branchées au backend plus tard.</p>

      {episodes.length === 0 ? (
        <div className="pub__empty">Aucune publication pour le moment. Publiez un épisode dans l’onglet ÉPISODES.</div>
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
                <div className="pub__stats">
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

              <div className="pub__actions">
                <button
                  type="button"
                  className="pub__btn"
                  onClick={() => {
                    togglePublishedEpisodeLike(ep.id);
                    setRefreshKey((k) => k + 1);
                  }}
                >
                  +1 Like
                </button>
                <button
                  type="button"
                  className="pub__btn"
                  onClick={() => {
                    updatePublishedEpisode(ep.id, (e) => ({ ...e, stats: { ...(e.stats ?? {}), views: (e.stats?.views ?? 0) + 1 } }));
                    setRefreshKey((k) => k + 1);
                  }}
                >
                  +1 Vue (demo)
                </button>
              </div>

              <div className="pub__comments">
                <div className="pub__comments-title">Commentaires</div>
                <div className="pub__comments-form">
                  <input
                    value={commentTextById[ep.id] ?? ''}
                    onChange={(e) => setCommentTextById((p) => ({ ...p, [ep.id]: e.target.value }))}
                    placeholder="Écrire un commentaire (demo)"
                  />
                  <button
                    type="button"
                    className="pub__btn pub__btn--primary"
                    onClick={() => {
                      const text = (commentTextById[ep.id] ?? '').trim();
                      if (!text) return;
                      addPublishedEpisodeComment(ep.id, { author: 'Lecteur', text });
                      setCommentTextById((p) => ({ ...p, [ep.id]: '' }));
                      setRefreshKey((k) => k + 1);
                    }}
                  >
                    Ajouter
                  </button>
                </div>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

