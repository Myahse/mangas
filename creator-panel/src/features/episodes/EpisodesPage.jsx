import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../pages/SeriesPage.css';
import '../../pages/EpisodesPage.css';
import { creatorApi } from '../../services/api';
import { notify } from '../../services/notify';
import { formatBytes, resizeForUpload } from './utils';

const LS_SERIES_THUMBS = 'MangAfriq_creator_series_thumbs_v1';

function normalizeSeriesTitle(t) {
  return (t || '').trim().toLowerCase();
}

function readStoredSeriesThumbnails(seriesTitle) {
  try {
    const raw = localStorage.getItem(LS_SERIES_THUMBS);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.thumbnails?.square?.url || !o?.thumbnails?.vertical?.url) return null;
    if (normalizeSeriesTitle(o.title) !== normalizeSeriesTitle(seriesTitle)) return null;
    return o.thumbnails;
  } catch {
    return null;
  }
}

/** Attach série thumbnails to episode API when the series title matches (no UI on this page). */
function thumbPayloadFromBundle(bundle) {
  if (!bundle?.square?.url || !bundle?.vertical?.url) return null;
  return {
    thumbnails: {
      square: JSON.parse(JSON.stringify(bundle.square)),
      vertical: JSON.parse(JSON.stringify(bundle.vertical)),
    },
  };
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const EP_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const EP_TOTAL_MAX_BYTES = 20 * 1024 * 1024;
const EP_TOTAL_MAX_FILES = 100;

function getPublishBlockingReasons({ episodeTitle, items, totals }) {
  const reasons = [];
  if (!episodeTitle.trim()) reasons.push("Titre d'épisode requis.");
  if (episodeTitle.length > 60) reasons.push("Titre d'épisode: maximum 60 caractères.");
  if (items.length === 0) reasons.push('Importer au moins 1 image.');
  if (items.length > EP_TOTAL_MAX_FILES) reasons.push('Maximum 100 images.');
  if (totals.totalBytes > EP_TOTAL_MAX_BYTES) reasons.push('Limite totale 20MB dépassée.');
  const invalid = items.filter((x) => x.error).length;
  if (invalid > 0) reasons.push(`${invalid} fichier(s) invalide(s) dans la liste.`);
  return reasons;
}

export default function EpisodesPage() {
  const location = useLocation();
  const [seriesTitle, setSeriesTitle] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [creatorNote, setCreatorNote] = useState('');
  const [saving, setSaving] = useState(false);

  /** Loaded from série submission / localStorage — used only for API thumb + preview header. */
  const [seriesThumbBundle, setSeriesThumbBundle] = useState(null);

  const [items, setItems] = useState([]);
  const filesInputRef = useRef(null);
  const draggingIdRef = useRef(null);

  const [previewMode, setPreviewMode] = useState('pc'); // 'pc' | 'mobile'
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [publishMode, setPublishMode] = useState('now'); // 'now' | 'schedule'
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [publishTime, setPublishTime] = useState('09:40');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get('seriesTitle') || '').trim();
    if (fromUrl) setSeriesTitle(fromUrl);
  }, [location.search]);

  useEffect(() => {
    return () => {
      for (const it of items) if (it.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(it.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const st = seriesTitle.trim();
    if (!st) {
      setSeriesThumbBundle(null);
      return;
    }

    const applyBundle = (thumbnails) => {
      if (!thumbnails?.square?.url || !thumbnails?.vertical?.url) return;
      setSeriesThumbBundle({
        square: { ...thumbnails.square },
        vertical: { ...thumbnails.vertical },
      });
    };

    const fromLs = readStoredSeriesThumbnails(st);
    if (fromLs) {
      if (!cancelled) applyBundle(fromLs);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const list = await creatorApi.listMySubmissions();
        if (!Array.isArray(list) || cancelled) return;
        const match = list.find(
          (s) => s?.payload && normalizeSeriesTitle(s.payload.title) === normalizeSeriesTitle(st),
        );
        const th = match?.payload?.thumbnails;
        if (th?.square?.url && th?.vertical?.url && !cancelled) applyBundle(th);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seriesTitle]);

  const episodeTitleLeft = 60 - episodeTitle.length;
  const noteLeft = 400 - creatorNote.length;

  const totals = useMemo(() => {
    const totalBytes = items.reduce((acc, it) => acc + (it.file?.size ?? 0), 0);
    return { totalBytes, count: items.length };
  }, [items]);

  const canSaveDraft = episodeTitle.trim().length > 0 && episodeTitle.length <= 60;

  const publishBlockingReasons = useMemo(
    () =>
      getPublishBlockingReasons({
        episodeTitle,
        items,
        totals,
      }),
    [episodeTitle, items, totals],
  );

  const canPublish = publishBlockingReasons.length === 0;

  const previewHeaderThumbUrl =
    seriesThumbBundle?.square?.url || items.find((x) => x.previewUrl)?.previewUrl || '';

  const addEpisodeFiles = async (fileList) => {
    const list = Array.from(fileList ?? []);
    if (list.length === 0) return;
    if (items.length >= EP_TOTAL_MAX_FILES) return;

    const remainingSlots = EP_TOTAL_MAX_FILES - items.length;
    const toProcess = list.slice(0, remainingSlots);

    const next = [];
    for (const f of toProcess) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        next.push({ id: crypto.randomUUID(), file: null, previewUrl: '', error: 'Format non autorisé (JPG, JPEG, PNG).', name: f.name });
        continue;
      }
      if (f.size > EP_IMAGE_MAX_BYTES) {
        next.push({ id: crypto.randomUUID(), file: null, previewUrl: '', error: `Fichier > 2MB (${formatBytes(f.size)}).`, name: f.name });
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        const resized = await resizeForUpload({ file: f, targetWidth: 800, targetHeight: 1280, maxBytes: EP_IMAGE_MAX_BYTES });
        const previewUrl = URL.createObjectURL(resized.file);
        next.push({ id: crypto.randomUUID(), file: resized.file, previewUrl, error: '', name: resized.file.name });
      } catch {
        next.push({ id: crypto.randomUUID(), file: null, previewUrl: '', error: "Impossible de lire l'image.", name: f.name });
      }
    }

    setItems((prev) => {
      const merged = [...prev, ...next];
      let total = 0;
      const kept = [];
      for (const it of merged) {
        const size = it.file?.size ?? 0;
        if (it.file && total + size > EP_TOTAL_MAX_BYTES) {
          if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
          kept.push({ ...it, file: null, previewUrl: '', error: 'Limite totale 20MB dépassée.' });
          continue;
        }
        total += size;
        kept.push(it);
      }
      return kept;
    });
  };

  const moveItem = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setItems((prev) => {
      const fromIndex = prev.findIndex((x) => x.id === fromId);
      const toIndex = prev.findIndex((x) => x.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const onFilesDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addEpisodeFiles(e.dataTransfer?.files);
  };

  const clearAll = () => {
    for (const it of items) if (it.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(it.previewUrl);
    setItems([]);
    if (filesInputRef.current) filesInputRef.current.value = '';
  };

  const onSaveDraft = async () => {
    if (!canSaveDraft) return;
    try {
      setSaving(true);
      const safeSeries = (seriesTitle || 'series')
        .trim()
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const safeEpisode = (episodeTitle || 'episode')
        .trim()
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const prefix = `episodes/${safeSeries}/${safeEpisode}`;

      const thumbPayload = thumbPayloadFromBundle(seriesThumbBundle);

      const files = items.filter((x) => x.file).map((x) => x.file);
      const uploadedImages = await Promise.all(files.map((f) => creatorApi.uploadFile({ file: f, prefix })));

      await creatorApi.createDraft({
        seriesTitle,
        episodeTitle: episodeTitle.trim(),
        creatorNote: creatorNote.trim() || null,
        commentsEnabled,
        publishMode,
        publishAt: publishMode === 'schedule' ? `${publishDate} ${publishTime}` : 'now',
        thumb: thumbPayload,
        images: uploadedImages.map((up, idx) => ({
          name: files[idx]?.name,
          size: files[idx]?.size,
          r2Key: up.key,
          url: up.url,
        })),
      });
      notify.success('Brouillon enregistré.');
    } catch (err) {
      notify.error(`Impossible d'enregistrer le brouillon. ${(err && err.message) || ''}`.trim());
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    if (!canPublish) return;
    try {
      setSaving(true);
      const safeSeries = (seriesTitle || 'series')
        .trim()
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const safeEpisode = (episodeTitle || 'episode')
        .trim()
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const prefix = `episodes/${safeSeries}/${safeEpisode}`;

      const thumbPayload = thumbPayloadFromBundle(seriesThumbBundle);

      const files = items.filter((x) => x.file).map((x) => x.file);
      const uploadedImages = await Promise.all(files.map((f) => creatorApi.uploadFile({ file: f, prefix })));

      await creatorApi.createPublished({
        scheduledFor: publishMode === 'schedule' ? `${publishDate} ${publishTime}` : null,
        seriesTitle,
        episodeTitle: episodeTitle.trim(),
        creatorNote: creatorNote.trim() || null,
        commentsEnabled,
        thumb: thumbPayload,
        images: uploadedImages.map((up, idx) => ({
          name: files[idx]?.name,
          size: files[idx]?.size,
          r2Key: up.key,
          url: up.url,
        })),
      });
      notify.success('Épisode publié.');
    } catch (err) {
      notify.error(`Impossible de publier l'épisode. ${(err && err.message) || ''}`.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="creator container">
      <div className="creator__tabs" role="tablist" aria-label="Navigation créateur">
        <a className="creator__tab" href="/series">
          SÉRIES
        </a>
        <a className="creator__tab is-active" href="/episodes" aria-current="page">
          ÉPISODES
        </a>
      </div>

      <div className="creator__grid">
        <main className="creator__main">
          <h1 className="creator__title">Publier un épisode</h1>

          {/* Titles */}
          <div className="ep__section">
            <div className="ep__row">
              <div className="ep__label">Titre de séries</div>
            </div>
            <label className="ep__field">
              <span>Série</span>
              <input value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value.slice(0, 80))} placeholder="Nom de la série" />
            </label>
            <label className="ep__field">
              <span>Titre d'épisode</span>
              <input value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value.slice(0, 60))} placeholder="Moins de 60 caractères" />
              <small className={`ep__count${episodeTitleLeft < 0 ? ' is-bad' : ''}`}>{episodeTitleLeft} caractères restants</small>
            </label>
          </div>

          {/* Files */}
          <div className="ep__section">
            <div className="ep__section-head">
              <div className="ep__label">Importer les fichiers</div>
            </div>
            <div className="ep__uploader" onDragOver={(e) => e.preventDefault()} onDrop={onFilesDrop}>
              <input
                ref={filesInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                multiple
                onChange={(e) => addEpisodeFiles(e.target.files)}
              />
              <div className="ep__uploader-top">
                <div className="ep__file-name">No file chosen</div>
                <div className="ep__uploader-actions">
                  <button type="button" className="ep__btn" onClick={() => filesInputRef.current?.click?.()}>
                    Choisir un fichier
                  </button>
                  <button type="button" className="ep__btn ep__btn--danger" onClick={clearAll}>
                    Tout supprimer
                  </button>
                  <div className="ep__quota-inline">
                    {formatBytes(totals.totalBytes)} / {formatBytes(EP_TOTAL_MAX_BYTES)}
                  </div>
                </div>
              </div>
              <div className="ep__drop-hint">Glissez et lâchez les fichiers d'image</div>

              {items.length > 0 && (
                <div className="ep__thumbs">
                  {items.slice(0, 12).map((it) => (
                    <div
                      key={it.id}
                      className={`ep__thumb-item${it.error ? ' has-error' : ''}`}
                      draggable={!it.error && Boolean(it.previewUrl)}
                      onDragStart={() => {
                        draggingIdRef.current = it.id;
                      }}
                      onDragOver={(e) => {
                        if (!draggingIdRef.current) return;
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = draggingIdRef.current;
                        draggingIdRef.current = null;
                        moveItem(fromId, it.id);
                      }}
                      onDragEnd={() => {
                        draggingIdRef.current = null;
                      }}
                      title="Glissez pour réordonner"
                    >
                      {it.previewUrl ? <img src={it.previewUrl} alt={it.name} /> : <div className="ep__thumb-ph" />}
                      <div className="ep__thumb-item-name">{it.name}</div>
                      {it.error && <div className="ep__thumb-item-err">{it.error}</div>}
                    </div>
                  ))}
                  {items.length > 12 && <div className="ep__more">+{items.length - 12} autres</div>}
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="ep__section">
            <label className="ep__field">
              <span>Note du créateur (Optionnel)</span>
              <textarea rows={4} value={creatorNote} onChange={(e) => setCreatorNote(e.target.value.slice(0, 400))} placeholder="Moins de 400 caractères" />
              <small className={`ep__count${noteLeft < 0 ? ' is-bad' : ''}`}>{noteLeft} caractères restants</small>
            </label>
          </div>

          {/* Preview */}
          <div className="ep__section">
            <div className="ep__label">Aperçu</div>
            <div className="ep__seg">
              <button type="button" className={`ep__seg-btn${previewMode === 'pc' ? ' is-active' : ''}`} onClick={() => setPreviewMode('pc')}>
                Aperçu PC
              </button>
              <button type="button" className={`ep__seg-btn${previewMode === 'mobile' ? ' is-active' : ''}`} onClick={() => setPreviewMode('mobile')}>
                Aperçu Mobile
              </button>
            </div>
            <div className={`ep__preview ep__preview--${previewMode}`} aria-label={`Aperçu ${previewMode === 'pc' ? 'PC' : 'Mobile'}`}>
              <div className="ep__preview-header">
                <div className="ep__preview-thumb">
                  {previewHeaderThumbUrl ? (
                    <img src={previewHeaderThumbUrl} alt="Visuel série ou première page" />
                  ) : (
                    <div className="ep__thumb-ph" aria-hidden="true" />
                  )}
                </div>
                <div className="ep__preview-headings">
                  <div className="ep__preview-series">{seriesTitle}</div>
                  <div className="ep__preview-title">{episodeTitle.trim() ? episodeTitle.trim() : "Titre d'épisode"}</div>
                  {creatorNote.trim() ? <div className="ep__preview-note">{creatorNote.trim()}</div> : null}
                </div>
              </div>
              <div className="ep__preview-pages">
                {items.filter((x) => x.previewUrl).slice(0, 6).map((it) => (
                  <img key={it.id} className="ep__preview-page" src={it.previewUrl} alt={it.name} />
                ))}
                {items.filter((x) => x.previewUrl).length === 0 && (
                  <div className="ep__preview-empty">Importez des images pour voir l’aperçu des pages (format 800×1280).</div>
                )}
              </div>
            </div>

            <button type="button" className="ep__btn ep__btn--primary" disabled={!canSaveDraft || saving} onClick={onSaveDraft}>
              Enregistrer un brouillon
            </button>
          </div>

          {/* Comments */}
          <div className="ep__section">
            <div className="ep__row ep__row--between">
              <div className="ep__label">Section commentaires</div>
              <div className="ep__seg">
                <button type="button" className={`ep__seg-btn${commentsEnabled ? ' is-active' : ''}`} onClick={() => setCommentsEnabled(true)}>
                  Activer
                </button>
                <button type="button" className={`ep__seg-btn${!commentsEnabled ? ' is-active' : ''}`} onClick={() => setCommentsEnabled(false)}>
                  Désactiver
                </button>
              </div>
            </div>
          </div>

          <div className="ep__section">
            <div className="ep__row ep__row--between">
              <div className="ep__label">Épisodes programmés</div>
              <div className="ep__pill">0</div>
            </div>
          </div>

          {/* Publish */}
          <div className="ep__section">
            <div className="ep__label">Publier</div>
            <div className="ep__seg">
              <button type="button" className={`ep__seg-btn${publishMode === 'now' ? ' is-active' : ''}`} onClick={() => setPublishMode('now')}>
                Immédiatement
              </button>
              <button type="button" className={`ep__seg-btn${publishMode === 'schedule' ? ' is-active' : ''}`} onClick={() => setPublishMode('schedule')}>
                Programmer pour plus tard
              </button>
            </div>

            {publishMode === 'schedule' && (
              <div className="ep__schedule">
                <label className="ep__field">
                  <span>Date</span>
                  <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
                </label>
                <label className="ep__field">
                  <span>Heure</span>
                  <input type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
                </label>
                <div className="ep__help">L'épisode sera publié à la date et à l'heure choisies.</div>
              </div>
            )}

            {!canPublish && publishBlockingReasons.length > 0 && (
              <div className="ep__error" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Publication bloquée</div>
                <ul style={{ marginLeft: 18, display: 'grid', gap: 4 }}>
                  {publishBlockingReasons.slice(0, 6).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <button type="button" className="ep__btn ep__btn--publish" disabled={!canPublish || saving} onClick={onPublish}>
              Publier un épisode
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
