import { useEffect, useMemo, useRef, useState } from 'react';
import './SeriesPage.css';
import { recordMangaSubmission } from '../services/adminBridge';
import ThumbnailGuideModal from '../components/modals/ThumbnailGuideModal';

const CATEGORY_1 = ['Action', 'Aventure', 'Comédie', 'Drame', 'Fantaisie', 'Horreur', 'Romance', 'Sci‑Fi', 'Thriller'];
const CATEGORY_2 = ['Shonen', 'Shojo', 'Seinen', 'Josei', 'Tranche de vie', 'Mystère', 'Surnaturel'];

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/** Reject wrong MIME labels; empty/octet-stream allowed — real format verified via magic bytes. */
function isAllowedImageMimeType(type) {
  const t = (type || '').toLowerCase().trim();
  if (!t) return true;
  if (t === 'application/octet-stream') return true;
  return ACCEPTED_TYPES.includes(t);
}

/** True only for raw JPEG or PNG file signatures (not WebP, GIF, BMP, SVG, etc.). */
async function isJpegOrPngSignature(file) {
  const buf = await file.slice(0, 8).arrayBuffer();
  const b = new Uint8Array(buf);
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png =
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a;
  return jpeg || png;
}

async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function isAspectRatio({ width, height }, ratioW, ratioH, tolerance = 0.01) {
  if (!width || !height) return false;
  // Compare via cross-multiplication to avoid float precision issues.
  const left = width * ratioH;
  const right = height * ratioW;
  const diff = Math.abs(left - right);
  return diff <= tolerance * right;
}

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid_image'));
    };
    img.src = url;
  });
}

function formatBytes(n) {
  if (typeof n !== 'number') return '';
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} kb`;
  return `${(kb / 1024).toFixed(1)} mb`;
}

export default function SeriesPage() {
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
    const expected =
      kind === 'square'
        ? { ratioW: 1, ratioH: 1, label: '1:1', maxBytes: 500 * 1024 }
        : { ratioW: 9, ratioH: 16, label: '9:16', maxBytes: 700 * 1024 };
    const setState = kind === 'square' ? setThumbSquare : setThumbVertical;
    const current = kind === 'square' ? thumbSquare : thumbVertical;

    if (current.url) URL.revokeObjectURL(current.url);

    if (!file) {
      setState({ file: null, url: '', dims: null, error: '' });
      return;
    }

    if (!isAllowedImageMimeType(file.type)) {
      setState({ file: null, url: '', dims: null, error: 'Format non autorisé (JPG, JPEG, PNG).' });
      return;
    }

    try {
      const signatureOk = await isJpegOrPngSignature(file);
      if (!signatureOk) {
        setState({
          file: null,
          url: '',
          dims: null,
          error: 'Fichier non valide : importez une image JPG ou PNG (autres formats non acceptés).',
        });
        return;
      }
      const dims = await getImageDimensions(file);
      const ratioOk = isAspectRatio(dims, expected.ratioW, expected.ratioH);
      if (!ratioOk) {
        setState({
          file: null,
          url: '',
          dims,
          error: `Proportions invalides: ${dims.width}×${dims.height}px. Requis: ${expected.label}.`,
        });
        return;
      }

      if (file.size > expected.maxBytes) {
        setState({
          file: null,
          url: '',
          dims,
          error: `Fichier trop lourd: ${formatBytes(file.size)}. Maximum: ${Math.round(expected.maxBytes / 1024)} kb.`,
        });
        return;
      }

      const url = URL.createObjectURL(file);
      setState({
        file,
        url,
        dims,
        error: '',
      });
    } catch {
      setState({ file: null, url: '', dims: null, error: "Impossible de lire l'image. Essayez un autre fichier." });
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

  const onCreate = (e) => {
    e.preventDefault();
    if (!canCreate) return;
    const payload = {
      thumbnails: {
        square: { name: thumbSquare.file?.name, size: thumbSquare.file?.size, type: thumbSquare.file?.type, dims: thumbSquare.dims },
        vertical: { name: thumbVertical.file?.name, size: thumbVertical.file?.size, type: thumbVertical.file?.type, dims: thumbVertical.dims },
      },
      category1,
      category2: category2 || null,
      title: title.trim(),
      summary: summary.trim(),
      acceptPolicies,
      explicit,
    };
    console.log('creator_create_series_submit', payload);
    recordMangaSubmission(payload);
    alert('Série envoyée à la modération (demo).');
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
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
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
                  L'image doit être au format carré (1:1) et ne doit pas dépasser 500 kb. Seuls les formats JPG, JPEG ou
                  PNG sont autorisés.
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
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
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
                  L'image doit être au format vertical (9:16) et ne doit pas dépasser 700 kb. Seuls les formats JPG, JPEG
                  ou PNG sont autorisés.
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
                <button className="creator__submit" type="submit" disabled={!canCreate}>
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

      <ThumbnailGuideModal
        isOpen={guideOpen}
        kind={guideKind}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}

