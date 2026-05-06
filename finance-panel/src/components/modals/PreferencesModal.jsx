import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLocale } from '../../hooks/useLocale.js';
import { useCurrency } from '../../hooks/useCurrency.js';
import { useI18n } from '../../i18n/i18n.js';
import './PreferencesModal.css';

export default function PreferencesModal({ isOpen, onClose }) {
  const { locale, setLocale } = useLocale();
  const { currency, setCurrency } = useCurrency();
  const { t } = useI18n();

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
    <div className="prefs-modal__overlay" onMouseDown={onClose} role="presentation">
      <div className="prefs-modal__panel" onMouseDown={(e) => e.stopPropagation()}>
        <button className="prefs-modal__close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>

        <div className="prefs-modal__center">
          <div className="prefs-modal__brand" aria-label="MangaAfrik Finance">
            <span>Manga</span>
            <span className="prefs-modal__brand-accent">Afrik</span>
          </div>
          <p className="prefs-modal__tagline">{t('common.preferences', 'Preferences')}</p>

          <div className="prefs-modal__rows">
            <div className="prefs-modal__row">
              <div className="prefs-modal__row-label">{t('common.language', 'Language')}</div>
              <div className="prefs-modal__segmented" role="group" aria-label={t('common.language', 'Language')}>
                <button type="button" className={`prefs-modal__segmented-btn${locale === 'fr' ? ' is-active' : ''}`} onClick={() => setLocale('fr')}>
                  FR
                </button>
                <button type="button" className={`prefs-modal__segmented-btn${locale === 'en' ? ' is-active' : ''}`} onClick={() => setLocale('en')}>
                  EN
                </button>
                <button type="button" className={`prefs-modal__segmented-btn${locale === 'ja' ? ' is-active' : ''}`} onClick={() => setLocale('ja')}>
                  日本語
                </button>
              </div>
            </div>

            <div className="prefs-modal__row">
              <div className="prefs-modal__row-label">{t('common.currency', 'Currency')}</div>
              <div className="prefs-modal__segmented" role="group" aria-label={t('common.currency', 'Currency')}>
                {['XOF', 'USD', 'EUR'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`prefs-modal__segmented-btn${currency === c ? ' is-active' : ''}`}
                    onClick={() => setCurrency(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="prefs-modal__footer">
            <button type="button" className="prefs-modal__done" onClick={onClose}>
              {t('common.done', 'Done')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

