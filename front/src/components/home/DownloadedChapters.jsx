import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { listDownloads, onDownloadsChanged, formatBytes } from '../../services/offline';
import './ContinueReading.css';

/** "Téléchargés": chapters saved for offline reading on this device. Hidden when there are none. */
export default function DownloadedChapters() {
  const [items, setItems] = useState(listDownloads);
  useEffect(() => onDownloadsChanged(() => setItems(listDownloads())), []);

  if (items.length === 0) return null;

  return (
    <section className="continue">
      <div className="section-header">
        <h2 className="section-title">Téléchargés</h2>
      </div>
      <div className="continue__list">
        {items.slice(0, 6).map((it) => (
          <Link key={`${it.slug}#${it.chapter}`} to={`/manga/${it.slug}/chapter/${it.chapter}`} className="continue__item">
            <img src={it.cover} alt={it.title} className="continue__cover" loading="lazy" />
            <div className="continue__info">
              <p className="continue__title">{it.title}</p>
              <p className="continue__meta">
                {`Chapitre ${it.chapter} · ${it.pageCount} pages${it.bytes ? ` · ${formatBytes(it.bytes)}` : ''}`}
              </p>
            </div>
            <span className="continue__play" aria-hidden="true"><Download size={14} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
