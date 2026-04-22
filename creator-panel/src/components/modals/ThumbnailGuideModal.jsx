import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Square, RectangleVertical } from 'lucide-react';
import './ThumbnailGuideModal.css';

const CONFIG = {
  square: {
    title: 'Guide — Thumbnail carré',
    ratioLabel: '1:1 (carré)',
    maxKb: 500,
    icon: Square,
    tips: [
      'Choisissez une image parfaitement carrée (ex: 1080×1080, 1200×1200, etc.).',
      'Évitez les bordures ou cadres (elles réduisent la zone utile).',
      'Gardez le sujet au centre pour un meilleur rendu dans les listes.',
    ],
    examples: {
      ok: ['1080×1080', '1200×1200', '2048×2048'],
      bad: ['1080×1920', '1920×1080', '1000×900'],
    },
  },
  vertical: {
    title: 'Guide — Thumbnail vertical',
    ratioLabel: '9:16 (vertical)',
    maxKb: 700,
    icon: RectangleVertical,
    tips: [
      'Choisissez une image au format 9:16 (ex: 1080×1920, 720×1280, etc.).',
      'Placez le personnage/titre dans la zone centrale (évitez le bas si vous ajoutez du texte).',
      'Préférez une image nette et contrastée (lisible sur mobile).',
    ],
    examples: {
      ok: ['1080×1920', '720×1280', '1440×2560'],
      bad: ['1080×1080', '1920×1080', '1000×1800'],
    },
  },
};

export default function ThumbnailGuideModal({ isOpen, kind = 'square', onClose }) {
  const cfg = useMemo(() => CONFIG[kind] ?? CONFIG.square, [kind]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="guide-modal__overlay" onMouseDown={onClose} role="presentation">
      <div className="guide-modal__panel" onMouseDown={(e) => e.stopPropagation()}>
        <button className="guide-modal__close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>

        <header className="guide-modal__header">
          <div className="guide-modal__heading">
            <div className="guide-modal__title">{cfg.title}</div>
            <div className="guide-modal__subtitle">
              Proportions requises: <strong>{cfg.ratioLabel}</strong> · Taille max: <strong>{cfg.maxKb}kb</strong> · Formats: <strong>JPG/PNG</strong>
            </div>
          </div>
        </header>

        <div className="guide-modal__content">
          <section className="guide-modal__section">
            <div className="guide-modal__section-title">À faire</div>
            <ul className="guide-modal__list">
              {cfg.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="guide-modal__section">
            <div className="guide-modal__section-title">Exemples (placeholders)</div>
            <div className="guide-modal__examples">
              <div className="guide-modal__example-card">
                <div className="guide-modal__example-title">Accepté</div>
                <div className={`guide-modal__preview guide-modal__preview--${kind}`}>
                  <div className="guide-modal__preview-label">Aperçu</div>
                </div>
                <div className="guide-modal__chips">
                  {cfg.examples.ok.map((x) => (
                    <span key={x} className="guide-modal__chip guide-modal__chip--ok">
                      {x}
                    </span>
                  ))}
                </div>
              </div>

              <div className="guide-modal__example-card">
                <div className="guide-modal__example-title">Refusé</div>
                <div className="guide-modal__bad-grid" aria-hidden="true">
                  <div className="guide-modal__bad guide-modal__bad--wide" />
                  <div className="guide-modal__bad guide-modal__bad--tall" />
                  <div className="guide-modal__bad guide-modal__bad--odd" />
                </div>
                <div className="guide-modal__chips">
                  {cfg.examples.bad.map((x) => (
                    <span key={x} className="guide-modal__chip guide-modal__chip--bad">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="guide-modal__footer">
            <button type="button" className="guide-modal__done" onClick={onClose}>
              J’ai compris
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

