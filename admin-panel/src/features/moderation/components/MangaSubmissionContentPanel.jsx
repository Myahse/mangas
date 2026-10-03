import { useEffect, useMemo, useState } from 'react';
import {
  episodePageUrls,
  episodesForSeriesTitle,
  submissionSquareThumb,
  submissionVerticalThumb,
} from '../lib/submissionAssets.js';

function EpisodePagesBlock({ label, episode }) {
  const pages = useMemo(() => episodePageUrls(episode.images), [episode.images]);
  const [lightbox, setLightbox] = useState('');

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox('');
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox]);

  if (pages.length === 0) {
    return (
      <div className="admin-submission-ep">
        <div className="admin-submission-ep__head">
          <span className="admin-submission-ep__title">{label}</span>
          <span className="admin-muted">No pages uploaded</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-submission-ep">
      <div className="admin-submission-ep__head">
        <span className="admin-submission-ep__title">{label}</span>
        <span className="admin-muted">{pages.length} page(s)</span>
      </div>
      {episode.creatorNote ? (
        <p className="admin-submission-ep__note">{episode.creatorNote}</p>
      ) : null}
      <div className="admin-submission-pages" role="list">
        {pages.map((src, idx) => (
          <button
            key={`${episode.id}-p-${idx}`}
            type="button"
            className="admin-submission-pages__item"
            onClick={() => setLightbox(src)}
            aria-label={`Page ${idx + 1}`}
          >
            <img src={src} alt={`Page ${idx + 1}`} loading="lazy" />
            <span className="admin-submission-pages__idx">{idx + 1}</span>
          </button>
        ))}
      </div>
      {lightbox ? (
        <div
          className="admin-submission-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Page preview"
          onClick={() => setLightbox('')}
        >
          <button type="button" className="admin-submission-lightbox__close" onClick={() => setLightbox('')}>
            Close
          </button>
          <img src={lightbox} alt="Full page" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}

export function MangaSubmissionContentPanel({ submission, drafts, published }) {
  const payload = submission?.payload || {};
  const square = submissionSquareThumb(payload);
  const vertical = submissionVerticalThumb(payload);

  const relatedDrafts = useMemo(
    () => episodesForSeriesTitle(drafts, payload.title),
    [drafts, payload.title],
  );
  const relatedPublished = useMemo(
    () => episodesForSeriesTitle(published, payload.title),
    [published, payload.title],
  );

  const categories = [payload.category1, payload.category2].filter(Boolean).join(' · ');

  return (
    <div className="admin-submission-content">
      <div className="admin-submission-content__covers">
        <div className="admin-submission-cover admin-submission-cover--square">
          {square ? <img src={square} alt="Square cover" /> : <div className="admin-submission-cover__ph">Square</div>}
          <span>Square cover</span>
        </div>
        <div className="admin-submission-cover admin-submission-cover--vertical">
          {vertical ? (
            <img src={vertical} alt="Vertical cover" />
          ) : (
            <div className="admin-submission-cover__ph">Vertical</div>
          )}
          <span>Vertical cover</span>
        </div>
      </div>

      <div className="admin-submission-content__meta">
        {categories ? (
          <p>
            <strong>Categories:</strong> {categories}
          </p>
        ) : null}
        {payload.summary ? (
          <p className="admin-submission-content__summary">
            <strong>Summary</strong>
            <br />
            {payload.summary}
          </p>
        ) : (
          <p className="admin-muted">No summary provided.</p>
        )}
        <p className="admin-muted" style={{ fontSize: 12 }}>
          Policies accepted: {payload.acceptPolicies ? 'yes' : 'no'}
        </p>
      </div>

      <div className="admin-submission-content__episodes">
        <h3 className="admin-submission-content__episodes-title">Episodes for this series</h3>
        {relatedPublished.length === 0 && relatedDrafts.length === 0 ? (
          <p className="admin-muted">No episode drafts or published chapters yet for this series title.</p>
        ) : (
          <>
            {relatedPublished.map((ep) => (
              <EpisodePagesBlock
                key={`pub-${ep.id}`}
                label={`Published — ${ep.episodeTitle || 'Untitled'} (${new Date(ep.publishedAt).toLocaleString()})`}
                episode={ep}
              />
            ))}
            {relatedDrafts.map((ep) => (
              <EpisodePagesBlock
                key={`draft-${ep.id}`}
                label={`Draft — ${ep.episodeTitle || 'Untitled'} (${new Date(ep.createdAt).toLocaleString()})`}
                episode={ep}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
