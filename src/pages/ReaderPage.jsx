import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Home, List,
  ZoomIn, ZoomOut, Settings, ArrowLeft,
} from 'lucide-react';
import { useFetch, fetchMangaBySlug, fetchChapters, fetchPages } from '../services/api';
import './ReaderPage.css';

export default function ReaderPage() {
  const { slug, chapter } = useParams();
  const chapterNum = parseInt(chapter, 10);

  const { data: manga }    = useFetch(fetchMangaBySlug, slug);
  const { data: pages }    = useFetch(fetchPages, slug, chapterNum);
  const { data: chapters } = useFetch(fetchChapters, slug);

  const pageList    = pages    ?? [];
  const chapterList = chapters ?? [];

  const [zoom, setZoom] = useState(100);
  const [showControls, setShowControls] = useState(true);
  const [showChapterList, setShowChapterList] = useState(false);
  const controlsTimeout = useRef(null);

  /* Hide controls on inactivity */
  const resetControlsTimer = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetControlsTimer();
    window.addEventListener('mousemove', resetControlsTimer);
    return () => {
      window.removeEventListener('mousemove', resetControlsTimer);
      clearTimeout(controlsTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!manga) {
    return (
      <div className="reader-notfound">
        <p>Manga introuvable</p>
        <Link to="/">Retour</Link>
      </div>
    );
  }

  return (
    <div className="reader reader--dark">
      {/* Top bar */}
      <div className={`reader__topbar${showControls ? ' reader__topbar--visible' : ''}`}>
        <div className="reader__topbar-left">
          <Link to={`/manga/${slug}`} className="reader__back-btn">
            <ArrowLeft size={18} />
            <span className="reader__back-title">{manga.title}</span>
          </Link>
        </div>
        <div className="reader__topbar-center">
          <span className="reader__chapter-label">Chapitre {chapterNum}</span>
          <span className="reader__page-label">{pageList.length} pages</span>
        </div>
        <div className="reader__topbar-right">
          {/* Zoom */}
          <button className="reader__ctrl-btn" onClick={() => setZoom(z => Math.max(50, z - 10))}>
            <ZoomOut size={16} />
          </button>
          <span className="reader__zoom-label">{zoom}%</span>
          <button className="reader__ctrl-btn" onClick={() => setZoom(z => Math.min(200, z + 10))}>
            <ZoomIn size={16} />
          </button>

          {/* Chapter list */}
          <button
            className={`reader__ctrl-btn${showChapterList ? ' reader__ctrl-btn--active' : ''}`}
            onClick={() => setShowChapterList(s => !s)}
            title="Chapitres"
          >
            <List size={16} />
          </button>

          {/* Home */}
          <Link to="/" className="reader__ctrl-btn" title="Accueil">
            <Home size={16} />
          </Link>
        </div>
      </div>

      {/* Chapter list panel */}
      {showChapterList && (
        <div className="reader__chapter-panel">
          <div className="reader__chapter-panel-header">
            <h3>{manga.title}</h3>
            <button onClick={() => setShowChapterList(false)}>✕</button>
          </div>
          <div className="reader__chapter-panel-list">
            {chapterList.map(ch => (
              <Link
                key={ch.number}
                to={`/manga/${slug}/chapter/${ch.number}`}
                className={`reader__chapter-link${ch.number === chapterNum ? ' reader__chapter-link--active' : ''}`}
                onClick={() => setShowChapterList(false)}
              >
                <span>Ch. {ch.number}</span>
                <span className="reader__chapter-link-date">{ch.date}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Scroll mode */}
      <div className="reader__scroll-mode">
        {pageList.map((p, i) => (
          <img
            key={p.url}
            src={p.url}
            alt={`Page ${i + 1}`}
            className="reader__scroll-page"
            style={{ maxWidth: `${zoom}%` }}
            loading="lazy"
          />
        ))}
      </div>

      {/* Bottom bar */}
      <div className={`reader__bottombar${showControls ? ' reader__bottombar--visible' : ''}`}>
        <div className="reader__chapter-nav">
          {chapterNum > 1 ? (
            <Link
              to={`/manga/${slug}/chapter/${chapterNum - 1}`}
              className="reader__chapter-nav-btn"
            >
              <ChevronLeft size={16} />
              Ch. {chapterNum - 1}
            </Link>
          ) : <div />}

          <Link to={`/manga/${slug}`} className="reader__chapter-index-btn">
            <Settings size={15} />
            Tous les chapitres
          </Link>

          {chapterNum < manga.totalChapters && (
            <Link
              to={`/manga/${slug}/chapter/${chapterNum + 1}`}
              className="reader__chapter-nav-btn"
            >
              Ch. {chapterNum + 1}
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
