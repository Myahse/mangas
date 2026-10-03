import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../pages/SeriesPage.css';
import '../../pages/EpisodesPage.css';
import { apiAssetUrl, creatorApi } from '../../services/api';
import { notify } from '../../services/notify';
import {
  formatBytes,
  normalizeEpisodePage,
  EP_PAGE_SPEC,
  SOURCE_IMAGE_MAX_BYTES,
  isSupportedSourceImage,
} from './utils';
import { isArchiveFile, isPdfFile } from '../../lib/episodeImportSources';
import {
  fetchSeriesTitleOptions,
  persistLastSeriesTitle,
  readLastSeriesTitle,
  resolveDefaultSeriesTitle,
} from '../../lib/creatorSeriesContext';

const LS_SERIES_THUMBS = 'MangAfric_creator_series_thumbs_v1';

function normalizeSeriesTitle(t) {
  return (t || '').trim().toLowerCase();
}

function normalizeEpisodeTitle(t) {
  return (t || '').trim().toLowerCase();
}

function pagePreviewUrl(page) {
  if (!page) return '';
  if (page.url) return apiAssetUrl(page.url);
  const key = page.r2Key || page.key;
  if (key) return apiAssetUrl(`/api/v1/storage/${String(key).replace(/^\//, '')}`);
  return '';
}

function imagesToEditorItems(images) {
  return (images || []).map((img, idx) => ({
    id: crypto.randomUUID(),
    serverPage: true,
    r2Key: img.r2Key || img.key || '',
    url: img.url || '',
    size: typeof img.size === 'number' ? img.size : 0,
    file: null,
    sourceFile: null,
    archiveFile: null,
    previewUrl: pagePreviewUrl(img),
    error: '',
    name: img.name || `page-${idx + 1}.jpg`,
  }));
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

const EP_TOTAL_MAX_BYTES = 20 * 1024 * 1024;
const EP_TOTAL_MAX_FILES = 100;

function getPublishBlockingReasons({ episodeTitle, items, totals }) {
  const reasons = [];
  if (!episodeTitle.trim()) reasons.push("Titre d'épisode requis.");
  if (episodeTitle.length > 60) reasons.push("Titre d'épisode: maximum 60 caractères.");
  const importables = items.filter(
    (x) => !x.error && (x.file || x.archiveFile || x.sourceFile || x.serverPage),
  );
  if (importables.length === 0) reasons.push('Importer au moins 1 image ou une archive.');
  if (items.length > EP_TOTAL_MAX_FILES) reasons.push('Maximum 100 images.');
  if (totals.totalBytes > EP_TOTAL_MAX_BYTES) reasons.push('Limite totale 20MB dépassée.');
  const invalid = items.filter((x) => x.error).length;
  if (invalid > 0) reasons.push(`${invalid} fichier(s) invalide(s) dans la liste.`);
  return reasons;
}

export default function EpisodesPage() {
  const location = useLocation();
  const [seriesTitle, setSeriesTitle] = useState(() => readLastSeriesTitle());
  const [seriesTitleOptions, setSeriesTitleOptions] = useState(() => {
    const last = readLastSeriesTitle();
    return last ? [last] : [];
  });
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [creatorNote, setCreatorNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  /** Loaded from série submission / localStorage — used only for API thumb + preview header. */
  const [seriesThumbBundle, setSeriesThumbBundle] = useState(null);

  const [items, setItems] = useState([]);
  const filesInputRef = useRef(null);
  const draggingIdRef = useRef(null);
  const publishSectionRef = useRef(null);

  const [previewMode, setPreviewMode] = useState('pc'); // 'pc' | 'mobile'
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [publishMode, setPublishMode] = useState('now'); // 'now' | 'schedule'
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [publishTime, setPublishTime] = useState('09:40');
  const [remoteEpisodes, setRemoteEpisodes] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteRefreshKey, setRemoteRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get('seriesTitle') || '').trim();
    (async () => {
      const [title, options] = await Promise.all([
        resolveDefaultSeriesTitle(fromUrl),
        fetchSeriesTitleOptions(),
      ]);
      if (cancelled) return;
      setSeriesTitleOptions(options);
      if (title) {
        setSeriesTitle(title);
        persistLastSeriesTitle(title);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const applySeriesTitle = (next) => {
    const t = String(next || '').slice(0, 80);
    setSeriesTitle(t);
    if (t.trim()) persistLastSeriesTitle(t);
  };

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

  useEffect(() => {
    let cancelled = false;
    const st = seriesTitle.trim();
    if (!st) {
      setRemoteEpisodes([]);
      return undefined;
    }
    setRemoteLoading(true);
    (async () => {
      try {
        const [drafts, published] = await Promise.all([
          creatorApi.listDrafts(),
          creatorApi.listPublished(),
        ]);
        if (cancelled) return;
        const all = [...(Array.isArray(published) ? published : []), ...(Array.isArray(drafts) ? drafts : [])];
        const forSeries = all.filter(
          (ep) => normalizeSeriesTitle(ep.seriesTitle) === normalizeSeriesTitle(st),
        );
        setRemoteEpisodes(forSeries);
      } catch {
        if (!cancelled) setRemoteEpisodes([]);
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seriesTitle, remoteRefreshKey]);

  useEffect(() => {
    const et = episodeTitle.trim();
    if (!et || items.length > 0) return;
    const exact = remoteEpisodes.find(
      (ep) => normalizeEpisodeTitle(ep.episodeTitle) === normalizeEpisodeTitle(et),
    );
    if (!exact?.images?.length) return;
    setItems(imagesToEditorItems(exact.images));
    if (exact.creatorNote && !creatorNote.trim()) {
      setCreatorNote(String(exact.creatorNote));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeTitle, remoteEpisodes]);

  const loadEpisodeFromServer = (ep) => {
    if (!ep) return;
    setEpisodeTitle(ep.episodeTitle || '');
    if (ep.creatorNote) setCreatorNote(String(ep.creatorNote));
    setItems(imagesToEditorItems(ep.images || []));
    notify.success('Pages chargées depuis le serveur.');
  };

  const episodeTitleLeft = 60 - episodeTitle.length;
  const noteLeft = 400 - creatorNote.length;

  const totals = useMemo(() => {
    const totalBytes = items.reduce((acc, it) => acc + (it.file?.size ?? it.size ?? 0), 0);
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

  const previewHeaderThumbUrl = useMemo(() => {
    const raw = seriesThumbBundle?.square?.url || items.find((x) => x.previewUrl)?.previewUrl || '';
    return raw.startsWith('blob:') ? raw : apiAssetUrl(raw);
  }, [seriesThumbBundle, items]);

  const buildEpisodePrefix = () => {
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
    return `episodes/${safeSeries}/${safeEpisode}`;
  };

  const uploadEpisodePages = async (prefix) => {
    const uploaded = [];
    const meta = [];
    for (const it of items) {
      if (it.error) continue;
      if (it.serverPage && (it.r2Key || it.url)) {
        uploaded.push({
          key: it.r2Key,
          url: it.url,
          size: it.size,
        });
        meta.push({ name: it.name, size: it.size });
        continue;
      }
      if (it.archiveFile) {
        const res = await creatorApi.uploadMangaArchive({
          file: it.archiveFile,
          prefix,
          normalize: 'episode_page',
        });
        for (const page of res.pages || []) {
          uploaded.push(page);
          meta.push({ name: it.name, size: page.size });
        }
        continue;
      }
      const raw = it.sourceFile || it.file;
      if (!raw) continue;
      const page = await creatorApi.uploadFile({ file: raw, prefix, normalize: 'episode_page' });
      uploaded.push(page);
      meta.push({ name: raw.name, size: raw.size });
    }
    return { uploaded, meta };
  };

  const addEpisodeFiles = async (fileList) => {
    const list = Array.from(fileList ?? []);
    if (list.length === 0) return;
    if (items.length >= EP_TOTAL_MAX_FILES) return;

    setImporting(true);
    try {
    const remainingSlots = EP_TOTAL_MAX_FILES - items.length;
    const slotsLeft = { n: remainingSlots };

    const next = [];
    for (const f of list) {
      if (slotsLeft.n <= 0) break;

      if (isArchiveFile(f) || isPdfFile(f)) {
        next.push({
          id: crypto.randomUUID(),
          archiveFile: f,
          file: null,
          sourceFile: null,
          previewUrl: '',
          error: '',
          name: f.name,
        });
        slotsLeft.n -= 1;
        continue;
      }

      if (!isSupportedSourceImage(f)) {
        next.push({
          id: crypto.randomUUID(),
          file: null,
          previewUrl: '',
          error: 'Format non reconnu (image, HEIC, ZIP, CBZ ou PDF).',
          name: f.name,
        });
        continue;
      }
      if (f.size > SOURCE_IMAGE_MAX_BYTES) {
        next.push({
          id: crypto.randomUUID(),
          file: null,
          previewUrl: '',
          error: `Fichier source trop lourd (max ${formatBytes(SOURCE_IMAGE_MAX_BYTES)}).`,
          name: f.name,
        });
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        const resized = await normalizeEpisodePage(f);
        const previewUrl = URL.createObjectURL(resized.file);
        next.push({
          id: crypto.randomUUID(),
          sourceFile: f,
          file: resized.file,
          previewUrl,
          error: '',
          name: resized.file.name,
          converted: true,
        });
        slotsLeft.n -= 1;
      } catch (err) {
        const msg =
          err?.message === 'output_too_large'
            ? `Impossible de compresser sous ${formatBytes(EP_PAGE_SPEC.maxBytes)}.`
            : "Impossible de lire ou convertir l'image.";
        next.push({ id: crypto.randomUUID(), file: null, previewUrl: '', error: msg, name: f.name });
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

    } finally {
      setImporting(false);
      if (filesInputRef.current) filesInputRef.current.value = '';
    }
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

  const removeItem = (id) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
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
      const prefix = buildEpisodePrefix();
      const thumbPayload = thumbPayloadFromBundle(seriesThumbBundle);
      const { uploaded: uploadedImages, meta } = await uploadEpisodePages(prefix);

      await creatorApi.createDraft({
        seriesTitle,
        episodeTitle: episodeTitle.trim(),
        creatorNote: creatorNote.trim() || null,
        commentsEnabled,
        publishMode,
        publishAt: publishMode === 'schedule' ? `${publishDate} ${publishTime}` : 'now',
        thumb: thumbPayload,
        images: uploadedImages.map((up, idx) => ({
          name: meta[idx]?.name,
          size: meta[idx]?.size ?? up.size,
          r2Key: up.key,
          url: up.url,
        })),
      });
      persistLastSeriesTitle(seriesTitle);
      notify.success('Brouillon enregistré.');
      setRemoteRefreshKey((k) => k + 1);
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
      const prefix = buildEpisodePrefix();
      const thumbPayload = thumbPayloadFromBundle(seriesThumbBundle);
      const { uploaded: uploadedImages, meta } = await uploadEpisodePages(prefix);

      await creatorApi.createPublished({
        scheduledFor: publishMode === 'schedule' ? `${publishDate} ${publishTime}` : null,
        seriesTitle,
        episodeTitle: episodeTitle.trim(),
        creatorNote: creatorNote.trim() || null,
        commentsEnabled,
        thumb: thumbPayload,
        images: uploadedImages.map((up, idx) => ({
          name: meta[idx]?.name,
          size: meta[idx]?.size ?? up.size,
          r2Key: up.key,
          url: up.url,
        })),
      });
      persistLastSeriesTitle(seriesTitle);
      notify.success('Épisode publié.');
      setRemoteRefreshKey((k) => k + 1);
    } catch (err) {
      notify.error(`Impossible de publier l'épisode. ${(err && err.message) || ''}`.trim());
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = () => {
    if (!canPublish) {
      const first = publishBlockingReasons[0];
      notify.info(first || 'Complétez le titre, importez des pages, puis publiez.');
      publishSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      return;
    }
    onPublish();
  };

  return (
    <div className="creator container ep-page">
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
          <p className="ep__lead">
            Renseignez la série et l&apos;épisode, importez vos pages (images, ZIP ou PDF), puis appuyez sur{' '}
            <strong>Publier</strong> (barre fixe en bas de l&apos;écran).
          </p>

          {/* Titles */}
          <div className="ep__section">
            <div className="ep__row">
              <div className="ep__label">Titre de séries</div>
            </div>
            <label className="ep__field">
              <span>Série</span>
              {seriesTitleOptions.length > 1 ? (
                <select
                  className="ep__select"
                  value={seriesTitle}
                  onChange={(e) => {
                    applySeriesTitle(e.target.value);
                    setItems([]);
                  }}
                >
                  {seriesTitleOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : seriesTitle.trim() ? (
                <input className="ep__input-readonly" value={seriesTitle} readOnly aria-readonly="true" />
              ) : (
                <input
                  value={seriesTitle}
                  onChange={(e) => applySeriesTitle(e.target.value)}
                  placeholder="Nom de la série"
                />
              )}
              <small className="ep__help ep__help--nb">
                {seriesTitleOptions.length > 0
                  ? 'Reprise automatique de votre série enregistrée — pas besoin de la retaper.'
                  : 'Créez d’abord une série dans l’onglet SÉRIES, ou saisissez le titre ici.'}
              </small>
            </label>
            <label className="ep__field">
              <span>Titre d'épisode</span>
              <input value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value.slice(0, 60))} placeholder="Moins de 60 caractères" />
              <small className={`ep__count${episodeTitleLeft < 0 ? ' is-bad' : ''}`}>{episodeTitleLeft} caractères restants</small>
            </label>
          </div>

          {seriesTitle.trim() && remoteEpisodes.length > 0 && (
            <div className="ep__section ep__section--remote">
              <div className="ep__label">Pages déjà sur le serveur</div>
              <p className="ep__help">
                {remoteLoading
                  ? 'Chargement…'
                  : 'Ces épisodes ont déjà été enregistrés. Choisissez-en un pour afficher les pages ici.'}
              </p>
              <div className="ep__remote-list">
                {remoteEpisodes.map((ep) => {
                  const pageCount = ep.images?.length ?? 0;
                  const isActive =
                    normalizeEpisodeTitle(ep.episodeTitle) === normalizeEpisodeTitle(episodeTitle);
                  return (
                    <div key={ep.id} className={`ep__remote-card${isActive ? ' is-active' : ''}`}>
                      <div className="ep__remote-card-head">
                        <strong>{ep.episodeTitle || 'Sans titre'}</strong>
                        <span className="ep__remote-meta">{pageCount} page(s)</span>
                      </div>
                      {pageCount > 0 ? (
                        <div className="ep__thumbs ep__thumbs--remote">
                          {ep.images.slice(0, 8).map((img, idx) => {
                            const src = pagePreviewUrl(img);
                            return src ? (
                              <img key={`${ep.id}-p-${idx}`} src={src} alt="" loading="lazy" />
                            ) : null;
                          })}
                        </div>
                      ) : null}
                      <button type="button" className="ep__btn" onClick={() => loadEpisodeFromServer(ep)}>
                        Afficher dans l&apos;éditeur
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files */}
          <div className="ep__section">
            <div className="ep__section-head">
              <div className="ep__label">Importer les fichiers</div>
            </div>
            <div className="ep__uploader" onDragOver={(e) => e.preventDefault()} onDrop={onFilesDrop}>
              <input
                ref={filesInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,.zip,.cbz,.pdf,image/*,application/pdf,application/zip"
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
              <div className="ep__drop-hint">
                Images, ZIP/CBZ ou PDF — aperçu local puis conversion serveur en {EP_PAGE_SPEC.width}×{EP_PAGE_SPEC.height}{' '}
                JPG (max {formatBytes(EP_PAGE_SPEC.maxBytes)} / page). HEIC iPhone accepté.
                {importing ? ' Import en cours…' : ''}
              </div>

              {items.length === 0 && seriesTitle.trim() && episodeTitle.trim() && !remoteLoading ? (
                <p className="ep__help ep__help--nb">
                  Aucun fichier local. Si vous avez déjà publié, utilisez « Pages déjà sur le serveur » ci-dessus ou
                  saisissez le même titre d&apos;épisode pour recharger automatiquement.
                </p>
              ) : null}

              {items.length > 0 && (
                <div className="ep__thumbs">
                  <div className="ep__thumbs-count">{items.length} page(s) dans l&apos;éditeur</div>
                  {items.map((it, idx) => (
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
                      <button
                        type="button"
                        className="ep__thumb-remove"
                        aria-label={`Supprimer la page ${idx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(it.id);
                        }}
                      >
                        ×
                      </button>
                      {it.previewUrl ? (
                        <img src={it.previewUrl} alt={it.name} />
                      ) : it.archiveFile ? (
                        <div className="ep__thumb-ph ep__thumb-ph--archive">ZIP/PDF</div>
                      ) : (
                        <div className="ep__thumb-ph" />
                      )}
                      <div className="ep__thumb-item-name">{it.name}</div>
                      {it.error && <div className="ep__thumb-item-err">{it.error}</div>}
                    </div>
                  ))}
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
          <div className="ep__section" ref={publishSectionRef}>
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

            <button type="button" className="ep__btn ep__btn--publish" disabled={saving} onClick={handlePublishClick}>
              Publier un épisode
            </button>
          </div>
        </main>
      </div>

      <div className="ep__sticky-actions" role="region" aria-label="Actions de publication">
        <button
          type="button"
          className="ep__btn ep__sticky-actions__draft"
          disabled={!canSaveDraft || saving}
          onClick={onSaveDraft}
        >
          Brouillon
        </button>
        <button
          type="button"
          className="ep__btn ep__btn--publish ep__sticky-actions__publish"
          disabled={saving}
          onClick={handlePublishClick}
        >
          {saving ? 'Publication…' : 'Publier'}
        </button>
      </div>
    </div>
  );
}
