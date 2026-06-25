import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './AfterSeriesCreateModal.css';

export default function AfterSeriesCreateModal({
  isOpen,
  title = '',
  onClose,
  onUploadNow,
  onDoLater,
}) {
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
    <div className="after-series__overlay" onMouseDown={onClose} role="presentation">
      <div className="after-series__panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="after-series__close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>

        <div className="after-series__title">Série créée</div>
        <div className="after-series__subtitle">
          {title ? (
            <>
              Votre série <strong>{title}</strong> a été envoyée à la modération.
            </>
          ) : (
            'Votre série a été envoyée à la modération.'
          )}
        </div>

        <div className="after-series__question">Souhaitez-vous importer le premier épisode maintenant ?</div>

        <div className="after-series__actions">
          <button type="button" className="after-series__btn after-series__btn--primary" onClick={onUploadNow}>
            Importer le 1er épisode
          </button>
          <button type="button" className="after-series__btn" onClick={onDoLater}>
            Plus tard
          </button>
        </div>

        <div className="after-series__hint">
          Un email de confirmation vous sera envoyé : nos modérateurs examinent votre série (réponse habituelle sous 24 h).
          Suivi du statut dans l’onglet Publications.
        </div>
      </div>
    </div>,
    document.body,
  );
}

