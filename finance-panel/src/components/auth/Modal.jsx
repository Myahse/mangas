import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, overlayClassName, panelClassName, children }) {
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
    <div className={overlayClassName} onMouseDown={onClose} role="presentation">
      <div className={panelClassName} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

