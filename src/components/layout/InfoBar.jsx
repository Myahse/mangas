import { useState, useEffect } from 'react';
import { X, Megaphone, Wrench, Info } from 'lucide-react';
import './InfoBar.css';

const MESSAGES = [
  { icon: 'announce', text: 'Les Tisserands du Vent — Chapitre 58 disponible !' },
  { icon: 'announce', text: 'Protocole Zéro Ch.61 vient de sortir — Lisez maintenant !' },
  { icon: 'maintenance', text: '🔧 Maintenance prévue le dimanche 15 mars de 02h00 à 04h00.' },
  { icon: 'info', text: 'ℹ️ Nouveau : mode lecture scroll disponible dans le lecteur !' },
];

const ICON_MAP = {
  announce:    <Megaphone size={13} />,
  maintenance: <Wrench    size={13} />,
  info:        <Info      size={13} />,
};

export default function InfoBar() {
  const [visible, setVisible]   = useState(true);
  const [current, setCurrent]   = useState(0);
  const [animating, setAnimating] = useState(false);

  /* Auto-rotate every 4 s */
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent(i => (i + 1) % MESSAGES.length);
        setAnimating(false);
      }, 280);
    }, 4000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const msg = MESSAGES[current];

  return (
    <div className="infobar">
      <div className="infobar__inner container">
        {/* Icon */}
        <span className="infobar__icon">{ICON_MAP[msg.icon]}</span>

        {/* Text */}
        <p className={`infobar__text${animating ? ' infobar__text--fade' : ''}`}>
          {msg.text}
        </p>

        {/* Dot indicators */}
        <div className="infobar__dots">
          {MESSAGES.map((_, i) => (
            <button
              key={i}
              className={`infobar__dot${i === current ? ' infobar__dot--active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Message ${i + 1}`}
            />
          ))}
        </div>

        {/* Close */}
        <button
          className="infobar__close"
          onClick={() => setVisible(false)}
          aria-label="Fermer"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
