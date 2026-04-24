import { useState, useEffect } from 'react';
import { X, Megaphone, Wrench, Info } from 'lucide-react';
import './InfoBar.css';

const ICON_MAP = {
  announce:    <Megaphone size={13} />,
  maintenance: <Wrench    size={13} />,
  info:        <Info      size={13} />,
};

export default function InfoBar() {
  const [visible, setVisible]   = useState(true);
  const [current, setCurrent]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const DEFAULT_BASE =
      import.meta?.env?.VITE_API_BASE_URL_DEFAULT || 'http://localhost:8082/api/v1';
    const base = (import.meta?.env?.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
    const url = `${base}/ads/system-notices`;

    fetch(url)
      .then(async (res) => {
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        return text ? JSON.parse(text) : [];
      })
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        const normalized = list
          .filter((n) => (n?.status || '').toLowerCase() === 'active')
          .map((n) => {
            const severity = (n?.severity || '').toLowerCase();
            const icon =
              severity === 'maintenance'
                ? 'maintenance'
                : severity === 'info'
                  ? 'info'
                  : 'announce';
            const title = n?.title ? String(n.title) : '';
            const message = n?.message ? String(n.message) : '';
            const text = title && message ? `${title} — ${message}` : (title || message);
            return { icon, text };
          })
          .filter((m) => m.text);
        setMessages(normalized);
        setCurrent(0);
      })
      .catch(() => {
        // If backend is unreachable, just hide the bar (no mock fallback).
        if (cancelled) return;
        setMessages([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Auto-rotate every 4 s */
  useEffect(() => {
    if (!visible) return;
    if (!messages.length) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent(i => (i + 1) % messages.length);
        setAnimating(false);
      }, 280);
    }, 4000);
    return () => clearInterval(timer);
  }, [visible, messages.length]);

  if (!visible) return null;
  if (!messages.length) return null;

  const msg = messages[current] || messages[0];

  return (
    <div className="infobar">
      <div className="infobar__inner container">
        {/* Icon */}
        <span className="infobar__icon">{ICON_MAP[msg.icon] || ICON_MAP.announce}</span>

        {/* Text */}
        <p className={`infobar__text${animating ? ' infobar__text--fade' : ''}`}>
          {msg.text}
        </p>

        {/* Dot indicators */}
        <div className="infobar__dots">
          {messages.map((_, i) => (
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
