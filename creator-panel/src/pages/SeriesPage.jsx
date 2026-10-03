import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SeriesPage.css';
import { creatorApi } from '../services/api';
import AfterSeriesCreateModal from '../components/modals/AfterSeriesCreateModal';
import ThumbnailGuideModal from '../components/modals/ThumbnailGuideModal';
import { notify } from '../services/notify';
import { persistLastSeriesTitle } from '../lib/creatorSeriesContext';
import {
  formatBytes,
  isSupportedSourceImage,
  normalizeSeriesThumbnail,
  SOURCE_IMAGE_MAX_BYTES,
  THUMB_SQUARE_SPEC,
  THUMB_VERTICAL_SPEC,
} from '../lib/imageFormat';

const CATEGORY_1 = ['Action', 'Aventure', 'Comédie', 'Drame', 'Fantaisie', 'Horreur', 'Romance', 'Sci‑Fi', 'Thriller'];
const CATEGORY_2 = ['Shonen', 'Shojo', 'Seinen', 'Josei', 'Tranche de vie', 'Mystère', 'Surnaturel'];

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export default function SeriesPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [thumbSquare, setThumbSquare] = useState({ file: null, url: '', dims: null, error: '' });
  const [thumbVertical, setThumbVertical] = useState({ file: null, url: '', dims: null, error: '' });
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideKind, setGuideKind] = useState('square'); // 'square' | 'vertical'
  const [category1, setCategory1] = useState('');
  const [category2, setCategory2] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [explicit, setExplicit] = useState(false);
  const [afterCreateOpen, setAfterCreateOpen] = useState(false);
  const [createdSeriesTitle, setCreatedSeriesTitle] = useState('');

  const squareInputRef = useRef(null);
  const verticalInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (thumbSquare.url) URL.revokeObjectURL(thumbSquare.url);
      if (thumbVertical.url) URL.revokeObjectURL(thumbVertical.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setThumbWithValidation = async ({ kind, file }) => {
    const spec = kind === 'square' ? THUMB_SQUARE_SPEC : THUMB_VERTICAL_SPEC;
    const setState = kind === 'square' ? setThumbSquare : setThumbVertical;
    const current = kind === 'square' ? thumbSquare : thumbVertical;

    if (current.url) URL.revokeObjectURL(current.url);

    if (!file) {
      setState({ file: null, url: '', dims: null, error: '' });
      return;
    }

    if (!isSupportedSourceImage(file)) {
      setState({ file: null, url: '', dims: null, error: 'Format non reconnu (JPG, PNG, WebP, GIF, BMP).' });
      return;
    }

    if (file.size > SOURCE_IMAGE_MAX_BYTES) {
      setState({
        file: null,
        url: '',
        dims: null,
        error: `Fichier source trop lourd (max ${formatBytes(SOURCE_IMAGE_MAX_BYTES)}).`,
      });
      return;
    }

    try {
      const normalized = await normalizeSeriesThumbnail(file, kind);
      const url = URL.createObjectURL(normalized.file);
      setState({ file: normalized.file, sourceFile: file, url, dims: normalized.dims, error: '' });
    } catch (err) {
      const msg =
        err?.message === 'output_too_large'
          ? `Impossible de compresser sous ${formatBytes(spec.maxBytes)}.`
          : "Impossible de lire ou convertir l'image.";
      setState({ file: null, url: '', dims: null, error: msg });
    }
  };

  const onDrop = (kind) => async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0] ?? null;
    await setThumbWithValidation({ kind, file });
  };

  const onPick = (kind) => async (e) => {
    const file = e.target.files?.[0] ?? null;
    await setThumbWithValidation({ kind, file });
  };

  const squareError = thumbSquare.error;
  const verticalError = thumbVertical.error;

  const titleLeft = 50 - title.length;
  const summaryLeft = 500 - summary.length;

  const canCreate =
    Boolean(thumbSquare.file) &&
    Boolean(thumbVertical.file) &&
    !squareError &&
    !verticalError &&
    category1 &&
    title.trim().length > 0 &&
    title.length <= 50 &&
    summary.trim().length > 0 &&
    summary.length <= 500 &&
    acceptPolicies;

  const onCreate = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    try {
      setSubmitting(true);
      const verticalDataUrl = await readAsDataUrl(thumbVertical.file);

      // Upload thumbnails to R2 (via backend)
      const safeTitle = title.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'series';
      const prefix = `series/${safeTitle}/thumbnails`;
      const [squareUp, verticalUp] = await Promise.all([
        creatorApi.uploadFile({
          file: thumbSquare.sourceFile || thumbSquare.file,
          prefix,
          normalize: 'thumb_square',
        }),
        creatorApi.uploadFile({
          file: thumbVertical.sourceFile || thumbVertical.file,
          prefix,
          normalize: 'thumb_vertical',
        }),
      ]);

      const payload = {
        thumbnails: {
          square: {
            name: thumbSquare.file?.name,
            size: thumbSquare.file?.size,
            type: thumbSquare.file?.type,
            dims: thumbSquare.dims,
            r2Key: squareUp.key,
            url: squareUp.url,
          },
          // Vertical thumbnail remains also available as Data URL so other panels (ads) can reuse it.
          vertical: {
            name: thumbVertical.file?.name,
            size: thumbVertical.file?.size,
            type: thumbVertical.file?.type,
            dims: thumbVertical.dims,
            dataUrl: verticalDataUrl,
            r2Key: verticalUp.key,
            url: verticalUp.url,
          },
        },
        category1,
        category2: category2 || null,
        title: title.trim(),
        summary: summary.trim(),
        acceptPolicies,
        explicit,
      };

      await creatorApi.createSubmission(payload);
      try {
        localStorage.setItem(
          'MangAfric_creator_series_thumbs_v1',
          JSON.stringify({ title: payload.title, thumbnails: payload.thumbnails }),
        );
      } catch {
        /* ignore quota / private mode */
      }
      persistLastSeriesTitle(payload.title);
      setCreatedSeriesTitle(payload.title);
      setAfterCreateOpen(true);
    } catch (err) {
      notify.error(`Impossible d'envoyer la série. ${(err && err.message) || ''}`.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="creator container">
      <div className="creator__tabs" role="tablist" aria-label="Navigation créateur">
        <a className="creator__tab is-active" href="/series" aria-current="page">
          SÉRIES
        </a>
        <a className="creator__tab" href="/episodes">
          ÉPISODES
        </a>
      </div>

      <div className="creator__grid">
        <main className="creator__main">
          <h1 className="creator__title">Créer une série</h1>

          <form className="creator__form creator__form--split" onSubmit={onCreate}>
            <div className="creator__left">
              <div className="creator__thumb-block">
                <div className="creator__section-head">
                  <h2 className="creator__section-title">Thumbnail carré</h2>
                  <button
                    type="button"
                    className="creator__guide-btn"
                    onClick={() => {
                      setGuideKind('square');
                      setGuideOpen(true);
                    }}
                  >
                    Guide
                  </button>
                </div>
                <label
                  className={`creator__dropzone creator__dropzone--standalone${thumbSquare.url ? ' has-preview' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop('square')}
                >
                  <input
                    ref={squareInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,image/jpeg,image/png,image/webp,image/gif,image/bmp"
                    onChange={onPick('square')}
                  />
                  <div className="creator__media creator__media--square">
                    {thumbSquare.url ? (
                      <img className="creator__media-img" src={thumbSquare.url} alt="Aperçu thumbnail carré" />
                    ) : (
                      <div className="creator__media-placeholder" aria-hidden="true" />
                    )}
                  </div>
                </label>
                <div className="creator__meta">
                  <div className="creator__dropzone-title">{thumbSquare.file?.name ?? 'No file chosen'}</div>
                  <div className="creator__dropzone-sub">
                    {thumbSquare.file
                      ? `${thumbSquare.dims ? `${thumbSquare.dims.width}×${thumbSquare.dims.height}px` : ''} · ${formatBytes(thumbSquare.file.size)}`
                      : "Choisissez une image à importer. Ou glissez le fichier d'image ici."}
                  </div>
                  {thumbSquare.file && (
                    <div className="creator__preview-actions">
                      <button
                        type="button"
                        className="creator__preview-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          squareInputRef.current?.click?.();
                        }}
                      >
                        Remplacer
                      </button>
                      <button
                        type="button"
                        className="creator__preview-btn creator__preview-btn--danger"
                        onClick={(e) => {
                          e.preventDefault();
                          if (squareInputRef.current) squareInputRef.current.value = '';
                          setThumbWithValidation({ kind: 'square', file: null });
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
                <p className="creator__help creator__help--mt">
                  Importez n’importe quelle image (JPG, PNG, WebP…). Elle sera recadrée et convertie automatiquement en{' '}
                  {THUMB_SQUARE_SPEC.width}×{THUMB_SQUARE_SPEC.height} px, max {formatBytes(THUMB_SQUARE_SPEC.maxBytes)}.
                </p>
                {squareError && <div className="creator__error">{squareError}</div>}
              </div>

              <div className="creator__thumb-block">
                <div className="creator__section-head">
                  <h2 className="creator__section-title">Thumbnail vertical</h2>
                  <button
                    type="button"
                    className="creator__guide-btn"
                    onClick={() => {
                      setGuideKind('vertical');
                      setGuideOpen(true);
                    }}
                  >
                    Guide
                  </button>
                </div>
                <label
                  className={`creator__dropzone creator__dropzone--standalone${thumbVertical.url ? ' has-preview' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop('vertical')}
                >
                  <input
                    ref={verticalInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,image/jpeg,image/png,image/webp,image/gif,image/bmp"
                    onChange={onPick('vertical')}
                  />
                  <div className="creator__media creator__media--vertical">
                    {thumbVertical.url ? (
                      <img className="creator__media-img" src={thumbVertical.url} alt="Aperçu thumbnail vertical" />
                    ) : (
                      <div className="creator__media-placeholder" aria-hidden="true" />
                    )}
                  </div>
                </label>
                <div className="creator__meta">
                  <div className="creator__dropzone-title">{thumbVertical.file?.name ?? 'No file chosen'}</div>
                  <div className="creator__dropzone-sub">
                    {thumbVertical.file
                      ? `${thumbVertical.dims ? `${thumbVertical.dims.width}×${thumbVertical.dims.height}px` : ''} · ${formatBytes(thumbVertical.file.size)}`
                      : "Choisissez une image à importer. Ou glissez le fichier d'image ici."}
                  </div>
                  {thumbVertical.file && (
                    <div className="creator__preview-actions">
                      <button
                        type="button"
                        className="creator__preview-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          verticalInputRef.current?.click?.();
                        }}
                      >
                        Remplacer
                      </button>
                      <button
                        type="button"
                        className="creator__preview-btn creator__preview-btn--danger"
                        onClick={(e) => {
                          e.preventDefault();
                          if (verticalInputRef.current) verticalInputRef.current.value = '';
                          setThumbWithValidation({ kind: 'vertical', file: null });
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
                <p className="creator__help creator__help--mt">
                  Importez n’importe quelle image (JPG, PNG, WebP…). Elle sera recadrée et convertie automatiquement en{' '}
                  {THUMB_VERTICAL_SPEC.width}×{THUMB_VERTICAL_SPEC.height} px, max {formatBytes(THUMB_VERTICAL_SPEC.maxBytes)}.
                </p>
                {verticalError && <div className="creator__error">{verticalError}</div>}
              </div>
            </div>

            <div className="creator__right">
              <section className="creator__section">
                <h2 className="creator__section-title">Catégories</h2>
                <div className="creator__row">
                  <label className="creator__field">
                    <span>Catégorie 1</span>
                    <select value={category1} onChange={(e) => setCategory1(e.target.value)}>
                      <option value="">Choisir</option>
                      {CATEGORY_1.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="creator__field">
                    <span>Catégorie 2 (optionnel)</span>
                    <select value={category2} onChange={(e) => setCategory2(e.target.value)}>
                      <option value="">Choisir</option>
                      {CATEGORY_2.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="creator__section">
                <label className="creator__field">
                  <span>Titre de séries</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                    placeholder="Moins de 50 caractères"
                  />
                  <small className={`creator__count${titleLeft < 0 ? ' is-bad' : ''}`}>{titleLeft} caractères restants</small>
                </label>

                <label className="creator__field">
                  <span>Résumé</span>
                  <textarea
                    rows={5}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value.slice(0, 500))}
                    placeholder="Moins de 500 caractères"
                  />
                  <small className={`creator__count${summaryLeft < 0 ? ' is-bad' : ''}`}>{summaryLeft} caractères restants</small>
                </label>
              </section>

              <section className="creator__section creator__section--notice">
                <h2 className="creator__section-title">POUR RAPPEL</h2>
                <p className="creator__help">
                  Nous n'acceptons pas la nudité ou la sexualité (totale ou partielle) ni la description graphique des actes
                  sexuels. Nous n'acceptons pas non plus la violence excessive ou les contenus réalisés dans l'intention de
                  choquer et d'offenser les lecteurs.
                </p>
              </section>

              <section className="creator__section">
                <label className="creator__check">
                  <input type="checkbox" checked={acceptPolicies} onChange={(e) => setAcceptPolicies(e.target.checked)} />
                  <span>J’accepte Politique de communauté et Politique de vie privée.</span>
                </label>
                <div className="creator__help">Vous ne pouvez pas publier si vous avez moins de 13 ans.</div>
                <label className="creator__check">
                  <input type="checkbox" checked={explicit} onChange={(e) => setExplicit(e.target.checked)} />
                  <span>Cette série peut comprendre des contenus explicites et requiert le contrôle parental. (optionnel)</span>
                </label>
              </section>

              <div className="creator__actions">
                <button className="creator__submit" type="submit" disabled={!canCreate || submitting}>
                  Créer une série
                </button>
              </div>
            </div>
          </form>
        </main>

        <aside className="creator__aside">
          <div className="creator__aside-card">
            <div className="creator__aside-title">AIDE</div>
            <p className="creator__aside-text">
              Créez votre série en quelques minutes en utilisant notamment ces astuces !
            </p>
            <div className="creator__aside-links">
              <button type="button" className="creator__aside-link">
                Politique de communauté
              </button>
              <button type="button" className="creator__aside-link">
                Importer les instructions
              </button>
              <button
                type="button"
                className="creator__aside-link"
                onClick={() => {
                  setGuideKind('square');
                  setGuideOpen(true);
                }}
              >
                Thumbnail carré — Guide
              </button>
            </div>
          </div>
        </aside>
      </div>
      <AfterSeriesCreateModal
        isOpen={afterCreateOpen}
        title={createdSeriesTitle}
        onClose={() => setAfterCreateOpen(false)}
        onUploadNow={() => {
          setAfterCreateOpen(false);
          navigate(`/episodes?seriesTitle=${encodeURIComponent(createdSeriesTitle || '')}`);
        }}
        onDoLater={() => {
          setAfterCreateOpen(false);
          navigate('/publications?tab=series');
        }}
      />
      <ThumbnailGuideModal
        isOpen={guideOpen}
        kind={guideKind}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}

