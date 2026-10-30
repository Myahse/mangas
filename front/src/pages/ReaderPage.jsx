import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Home, List,
  ZoomIn, ZoomOut, Settings, ArrowLeft, Feather, Download, CheckCircle2, Languages, Headphones,
} from 'lucide-react';
import GriotBar from '../components/reader/GriotBar';
import PollCard from '../components/reader/PollCard';
import CommentsSection from '../components/reader/CommentsSection';
import { notify } from '../services/notify';
import {
  offlineSupported, isDownloaded, downloadChapter, removeDownload, onDownloadsChanged, formatBytes,
} from '../services/offline';
import {
  useFetch,
  fetchMangaBySlug,
  fetchChapters,
  fetchPages,
  fetchWallet,
  dailyClaimCoins,
  unlockChapter,
  recordChapterView,
  saveReadingProgress,
  prefetchChapterPages,
  getDataSaver,
  setDataSaver,
  pageImageUrl,
  fetchChapterLanguages,
  fetchChapterBubbles,
  fetchChapterNotes,
  fetchNarration,
} from '../services/api';
import { onWalletUpdated } from '../realtime/walletEvents';
import './ReaderPage.css';

export default function ReaderPage() {
  const { slug, chapter } = useParams();
  const chapterNum = parseInt(chapter, 10);

  const { data: manga }    = useFetch(fetchMangaBySlug, slug);
  const [pagesKey, setPagesKey] = useState(0);
  const { data: pages, error: pagesError, loading: pagesLoading } = useFetch(fetchPages, slug, chapterNum, pagesKey);
  const { data: chapters } = useFetch(fetchChapters, slug);
  const [walletKey, setWalletKey] = useState(0);
  const { data: wallet } = useFetch(fetchWallet, walletKey);

  // useFetch keeps the previous result while loading or on error; never show another chapter's pages.
  const pageList    = pagesLoading || pagesError ? [] : (pages ?? []);
  const chapterList = chapters ?? [];

  const [zoom, setZoom] = useState(100);
  const [dataSaver, setDataSaverState] = useState(getDataSaver);
  const toggleDataSaver = () => {
    const next = !dataSaver;
    setDataSaverState(next);
    setDataSaver(next);
    notify.info(next
      ? 'Économie de données activée : images plus légères.'
      : 'Économie de données désactivée : images en pleine qualité.');
  };

  /* ─── Community translations ─── */
  // The reader's language is remembered; a chapter without it shows the original.
  const [readLang, setReadLang] = useState(() => {
    try { return localStorage.getItem('mangafric.readLang') || ''; } catch { return ''; }
  });
  const [showLangPanel, setShowLangPanel] = useState(false);
  const [peeked, setPeeked] = useState({});
  const { data: chapterLanguages } = useFetch(fetchChapterLanguages, slug, chapterNum);
  const languageList = Array.isArray(chapterLanguages) ? chapterLanguages : [];
  const activeLang = languageList.some((l) => l.code === readLang) ? readLang : '';
  const { data: bubbleData } = useFetch(fetchChapterBubbles, slug, chapterNum, activeLang);
  const bubblesByPage = {};
  (activeLang && bubbleData?.lang === activeLang ? bubbleData.bubbles : []).forEach((b) => {
    (bubblesByPage[b.page] ||= []).push(b);
  });
  /* ─── Cultural notes ─── */
  const [showNotes, setShowNotes] = useState(() => {
    try { return localStorage.getItem('mangafric.showNotes') !== 'off'; } catch { return true; }
  });
  const [openNote, setOpenNote] = useState(null);
  const { data: chapterNotes } = useFetch(fetchChapterNotes, slug, chapterNum);
  const noteList = Array.isArray(chapterNotes) ? chapterNotes : [];
  const notesByPage = {};
  noteList.forEach((n) => { (notesByPage[n.page] ||= []).push(n); });
  const toggleNotes = () => {
    const next = !showNotes;
    setShowNotes(next);
    setOpenNote(null);
    try { localStorage.setItem('mangafric.showNotes', next ? 'on' : 'off'); } catch {}
  };

  /* ─── Griot mode ─── */
  const [griot, setGriot] = useState(null); // { lang, steps } while narrating
  const [griotFocus, setGriotFocus] = useState(null); // bubble being told
  const startGriot = async () => {
    if (griot) { setGriot(null); setGriotFocus(null); return; }
    try {
      const narration = await fetchNarration(slug, chapterNum, activeLang);
      const steps = Array.isArray(narration?.steps) ? narration.steps.filter((s) => s.text) : [];
      if (steps.length === 0) {
        notify.info(activeLang
          ? 'Aucune bulle traduite à raconter dans cette langue pour l’instant.'
          : 'Aucune bulle à raconter pour l’instant : entourez-les dans « Traduire ce chapitre ».');
        return;
      }
      setOpenNote(null);
      setShowLangPanel(false);
      setGriot({ lang: narration.lang, steps });
    } catch (e) {
      notify.error(e?.message || 'Mode griot indisponible.');
    }
  };
  useEffect(() => { setGriot(null); setGriotFocus(null); }, [slug, chapterNum]);
  const focusGriotStep = (i) => {
    const step = griot?.steps[i];
    if (!step) return;
    setGriotFocus(step);
    const el = scrollRef.current;
    const img = pageRefs.current[step.page - 1];
    if (!el || !img) return;
    const r = img.getBoundingClientRect();
    const bubbleTop = r.top + (r.height * step.y) / 100;
    el.scrollTo({ top: el.scrollTop + bubbleTop - el.getBoundingClientRect().top - el.clientHeight * 0.3, behavior: 'smooth' });
  };

  const chooseLang = (code) => {
    setReadLang(code);
    setPeeked({});
    setShowLangPanel(false);
    try { localStorage.setItem('mangafric.readLang', code); } catch {}
  };

  /* ─── Offline download ─── */
  const [downloaded, setDownloaded] = useState(() => isDownloaded(slug, chapterNum));
  const [downloadProgress, setDownloadProgress] = useState(null); // { done, total } while downloading
  useEffect(() => {
    const sync = () => setDownloaded(isDownloaded(slug, chapterNum));
    sync();
    return onDownloadsChanged(sync);
  }, [slug, chapterNum]);

  const toggleDownload = async () => {
    if (downloadProgress) return;
    if (downloaded) {
      if (!window.confirm('Supprimer ce chapitre des téléchargements ?')) return;
      await removeDownload(slug, chapterNum);
      notify.info('Téléchargement supprimé.');
      return;
    }
    setDownloadProgress({ done: 0, total: 0 });
    try {
      const entry = await downloadChapter({
        slug,
        chapter: chapterNum,
        title: manga?.title,
        cover: manga?.cover,
        lite: dataSaver,
        lang: activeLang,
        onProgress: (done, total) => setDownloadProgress({ done, total }),
      });
      notify.success(`Chapitre ${chapterNum} disponible hors-ligne (${formatBytes(entry.bytes)}).`);
    } catch (e) {
      notify.error(e?.message || 'Téléchargement impossible.');
    } finally {
      setDownloadProgress(null);
    }
  };
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

  useEffect(() => onWalletUpdated(() => setWalletKey((k) => k + 1)), []);

  const viewRecordedKeyRef = useRef('');
  useEffect(() => {
    const key = `${slug}:${chapterNum}`;
    if (!slug || !chapterNum || pageList.length === 0 || pagesError) return;
    if (viewRecordedKeyRef.current === key) return;
    viewRecordedKeyRef.current = key;
    recordChapterView(slug, chapterNum).then(({ streakReward }) => {
      if (streakReward > 0) {
        notify.success(`Série de lecture : encore une semaine d’affilée, +${streakReward} coins !`);
        setWalletKey((k) => k + 1);
      }
    });
  }, [slug, chapterNum, pageList.length, pagesError]);

  /* ─── Reading progress ─── */
  // ?page=N (1-based) comes from "Reprendre la lecture".
  const [searchParams] = useSearchParams();
  const resumePage = Math.max(0, (parseInt(searchParams.get('page') || '1', 10) || 1) - 1);
  const scrollRef = useRef(null);
  const pageRefs = useRef([]);
  const [currentPage, setCurrentPage] = useState(0);
  const resumedKeyRef = useRef('');
  const hasManga = Boolean(manga);

  const nextChapterNum = (() => {
    const later = chapterList.map((c) => c.number).filter((n) => n > chapterNum);
    if (later.length) return Math.min(...later);
    return manga && chapterNum < manga.totalChapters ? chapterNum + 1 : null;
  })();

  // New chapter: back to the top (or to the resume page once it has loaded).
  useEffect(() => {
    setCurrentPage(resumePage);
    if (resumePage === 0 && scrollRef.current) scrollRef.current.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, chapterNum]);

  // Jump as soon as the resume page itself has loaded. Earlier pages stay lazy (no extra data);
  // when they load above it, the browser's scroll anchoring keeps the reader on the same page.
  useEffect(() => {
    const key = `${slug}:${chapterNum}`;
    if (resumePage === 0 || pageList.length === 0 || resumedKeyRef.current === key) return;
    const target = Math.min(resumePage, pageList.length - 1);
    const targetImg = pageRefs.current[target];
    let cancelled = false;
    new Promise((done) => {
      if (!targetImg || targetImg.complete) return done();
      targetImg.addEventListener('load', done, { once: true });
      targetImg.addEventListener('error', done, { once: true });
    }).then(() => {
      const el = scrollRef.current;
      const img = pageRefs.current[target];
      if (cancelled || !el || !img) return;
      resumedKeyRef.current = key;
      el.scrollTop += img.getBoundingClientRect().top - el.getBoundingClientRect().top - 60;
    });
    return () => { cancelled = true; };
  }, [slug, chapterNum, resumePage, pageList.length, hasManga]);

  // Page reached = the last page whose top is above the middle of the screen.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || pageList.length === 0) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
        if (atEnd) return setCurrentPage(pageList.length - 1);
        const middle = el.scrollTop + el.clientHeight / 2;
        let idx = 0;
        pageRefs.current.forEach((img, i) => {
          // the image sits at the top of its positioned .reader__scroll-item, so measure the wrapper
          const top = img?.parentElement?.offsetTop ?? 0;
          if (img && i < pageList.length && top <= middle) idx = i;
        });
        setCurrentPage(idx);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
    // hasManga: the scroll area only exists once the series has loaded.
  }, [pageList.length, hasManga]);

  // Save the position shortly after the reader stops on a page, and when leaving the chapter.
  const latestProgress = useRef(null);
  useEffect(() => {
    if (!slug || !chapterNum || pageList.length === 0 || pagesError) return;
    latestProgress.current = { slug, chapterNum, page: currentPage, count: pageList.length };
    const t = setTimeout(() => saveReadingProgress(slug, chapterNum, currentPage, pageList.length), 1500);
    return () => clearTimeout(t);
  }, [slug, chapterNum, currentPage, pageList.length, pagesError]);

  useEffect(() => () => {
    const p = latestProgress.current;
    if (p) saveReadingProgress(p.slug, p.chapterNum, p.page, p.count);
  }, [slug, chapterNum]);

  // Past two thirds of the chapter: warm up the next one so it opens instantly.
  const prefetchedRef = useRef('');
  useEffect(() => {
    if (!nextChapterNum || pageList.length === 0) return;
    if (currentPage + 1 < Math.ceil(pageList.length * 0.66)) return;
    const key = `${slug}:${nextChapterNum}`;
    if (prefetchedRef.current === key) return;
    prefetchedRef.current = key;
    prefetchChapterPages(slug, nextChapterNum, 4, dataSaver);
  }, [slug, nextChapterNum, currentPage, pageList.length, dataSaver]);

  if (!manga) {
    return (
      <div className="reader-notfound">
        <p>Manga introuvable</p>
        <Link to="/">Retour</Link>
      </div>
    );
  }

  // The API answers 403 with error "Forbidden" (the "Locked: unlock chapter" text is in message).
  const isLocked = Boolean(pagesError && /locked|forbidden/.test(String(pagesError).toLowerCase()));
  const needsLogin = Boolean(pagesError && String(pagesError).toLowerCase().includes('unauthorized'));

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
          <span className="reader__page-label">
            {pageList.length ? `Page ${Math.min(currentPage + 1, pageList.length)} / ${pageList.length}` : '0 pages'}
          </span>
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

          {/* Data saver */}
          <button
            className={`reader__ctrl-btn${dataSaver ? ' reader__ctrl-btn--active' : ''}`}
            onClick={toggleDataSaver}
            title="Économie de données"
            aria-label="Économie de données"
            aria-pressed={dataSaver}
          >
            <Feather size={16} />
          </button>

          {/* Offline download */}
          {offlineSupported && pageList.length > 0 ? (
            <button
              className={`reader__ctrl-btn${downloaded ? ' reader__ctrl-btn--active' : ''}`}
              onClick={toggleDownload}
              disabled={Boolean(downloadProgress)}
              title={downloaded ? 'Disponible hors-ligne (cliquer pour supprimer)' : 'Télécharger pour lire hors-ligne'}
              aria-label={downloaded ? 'Supprimer le téléchargement' : 'Télécharger pour lire hors-ligne'}
            >
              {downloadProgress
                ? <span className="reader__zoom-label">{downloadProgress.done}/{downloadProgress.total || '…'}</span>
                : downloaded ? <CheckCircle2 size={16} /> : <Download size={16} />}
            </button>
          ) : null}

          {/* Griot mode */}
          {pageList.length > 0 ? (
            <button
              className={`reader__ctrl-btn${griot ? ' reader__ctrl-btn--active' : ''}`}
              onClick={startGriot}
              title="Mode griot : écouter le chapitre"
              aria-label="Mode griot"
              aria-pressed={Boolean(griot)}
            >
              <Headphones size={16} />
            </button>
          ) : null}

          {/* Language */}
          <button
            className={`reader__ctrl-btn${readLang ? ' reader__ctrl-btn--active' : ''}`}
            onClick={() => { setShowLangPanel((s) => !s); setShowChapterList(false); }}
            title="Langue"
            aria-label="Langue"
          >
            <Languages size={16} />
          </button>

          {/* Chapter list */}
          <button
            className={`reader__ctrl-btn${showChapterList ? ' reader__ctrl-btn--active' : ''}`}
            onClick={() => { setShowChapterList(s => !s); setShowLangPanel(false); }}
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

      {/* Language panel */}
      {showLangPanel && (
        <div className="reader__chapter-panel">
          <div className="reader__chapter-panel-header">
            <h3>Langue</h3>
            <button onClick={() => setShowLangPanel(false)}>✕</button>
          </div>
          <div className="reader__chapter-panel-list">
            <button
              type="button"
              className={`reader__chapter-link${!readLang ? ' reader__chapter-link--active' : ''}`}
              onClick={() => chooseLang('')}
            >
              <span>Version originale</span>
            </button>
            {languageList.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`reader__chapter-link${readLang === l.code ? ' reader__chapter-link--active' : ''}`}
                onClick={() => chooseLang(l.code)}
              >
                <span>{l.name}</span>
                <span className="reader__chapter-link-date">{l.translated}/{l.bubbles} bulles</span>
              </button>
            ))}
            {languageList.length === 0 ? (
              <p className="reader__lang-note">Pas encore de traduction pour ce chapitre.</p>
            ) : null}
            <button
              type="button"
              className={`reader__chapter-link${showNotes ? ' reader__chapter-link--active' : ''}`}
              onClick={toggleNotes}
              aria-pressed={showNotes}
            >
              <span>Notes culturelles</span>
              <span className="reader__chapter-link-date">
                {showNotes ? 'affichées' : 'masquées'} · {noteList.length}
              </span>
            </button>
            <Link to={`/translate/${slug}/${chapterNum}`} className="reader__chapter-link">
              <span>Traduire ce chapitre</span>
              <span className="reader__chapter-link-date">+2 coins par bulle</span>
            </Link>
            <Link to={`/translate/${slug}/${chapterNum}?mode=notes`} className="reader__chapter-link">
              <span>Ajouter une note culturelle</span>
              <span className="reader__chapter-link-date">+3 coins</span>
            </Link>
          </div>
        </div>
      )}

      {griot ? (
        <GriotBar
          key={`${slug}:${chapterNum}:${griot.lang}`}
          steps={griot.steps}
          lang={griot.lang}
          onStep={focusGriotStep}
          onClose={() => { setGriot(null); setGriotFocus(null); }}
        />
      ) : null}

      {/* Cultural note card */}
      {openNote && (
        <div className="reader__note-card" role="dialog" aria-label={openNote.title}>
          <div className="reader__note-card-head">
            <h3>{openNote.title}</h3>
            <button type="button" onClick={() => setOpenNote(null)} aria-label="Fermer">✕</button>
          </div>
          <p className="reader__note-card-body">{openNote.body}</p>
          <p className="reader__note-card-author">Note de {openNote.authorName}</p>
        </div>
      )}

      {/* Scroll mode */}
      <div className="reader__scroll-mode" ref={scrollRef}>
        {needsLogin ? (
          <div className="reader-notfound" style={{ padding: 24 }}>
            <p>Connectez-vous pour lire ce chapitre.</p>
            <Link to={`/manga/${slug}`}>Retour</Link>
          </div>
        ) : isLocked ? (
          <div className="reader-notfound" style={{ padding: 24 }}>
            <p style={{ fontWeight: 900 }}>Chapitre verrouillé</p>
            <p style={{ opacity: 0.85, marginTop: 6 }}>
              Solde: <strong>{wallet?.balance ?? 0}</strong> coins
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button
                className="reader__chapter-index-btn"
                type="button"
                onClick={() => {
                  unlockChapter(slug, chapterNum)
                    .then(() => {
                      setWalletKey((k) => k + 1);
                      setPagesKey((k) => k + 1);
                    })
                    .catch((e) => alert(e?.message || 'Unlock failed'));
                }}
              >
                Débloquer ce chapitre
              </button>
              {wallet?.rewardsEnabled ? (
                <button
                  className="reader__chapter-nav-btn"
                  type="button"
                  onClick={() => {
                    dailyClaimCoins()
                      .then(() => setWalletKey((k) => k + 1))
                      .catch(() => {});
                  }}
                >
                  Réclamer bonus quotidien
                </button>
              ) : null}
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to={`/manga/${slug}`} className="reader__back-btn">
                Retour aux chapitres
              </Link>
            </div>
          </div>
        ) : (
          <>
            {pageList.map((p, i) => (
              <div
                key={p.url}
                className={`reader__scroll-item${dataSaver ? ' reader__scroll-item--lite' : ''}`}
                style={{ maxWidth: `${zoom}%`, '--reader-zoom': zoom / 100 }}
              >
                <img
                  ref={(el) => { pageRefs.current[i] = el; }}
                  src={pageImageUrl(p.url, dataSaver)}
                  alt={`Page ${i + 1}`}
                  className="reader__scroll-page"
                  loading={i === resumePage ? 'eager' : 'lazy'}
                  onLoad={(e) => e.currentTarget.classList.add('reader__scroll-page--loaded')}
                />
                {(bubblesByPage[i + 1] || []).map((b) => (
                  <span
                    key={b.id}
                    className={`reader__bubble${peeked[b.id] ? ' reader__bubble--peek' : ''}`}
                    style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                    title={b.originalText ? `Original : ${b.originalText}` : undefined}
                    onClick={() => setPeeked((s) => ({ ...s, [b.id]: !s[b.id] }))}
                  >
                    {b.text}
                  </span>
                ))}
                {griot && griotFocus?.page === i + 1 ? (
                  <span
                    className="reader__griot-focus"
                    style={{ left: `${griotFocus.x}%`, top: `${griotFocus.y}%`, width: `${griotFocus.w}%`, height: `${griotFocus.h}%` }}
                  />
                ) : null}
                {showNotes && (notesByPage[i + 1] || []).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="reader__note-dot"
                    style={{ left: `${n.x + n.w}%`, top: `${n.y}%` }}
                    onClick={() => setOpenNote(n)}
                    aria-label={`Note culturelle : ${n.title}`}
                    title={n.title}
                  >
                    i
                  </button>
                ))}
              </div>
            ))}
            {pageList.length > 0 ? (
              <div className="reader__chapter-end">
                <p className="reader__chapter-end-title">Fin du chapitre {chapterNum}</p>
                <PollCard slug={slug} chapterNumber={chapterNum} onCoinsSpent={() => setWalletKey((k) => k + 1)} />
                {nextChapterNum ? (
                  <Link to={`/manga/${slug}/chapter/${nextChapterNum}`} className="reader__chapter-nav-btn">
                    Chapitre suivant
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  <>
                    <p className="reader__chapter-end-note">Vous êtes à jour. Le prochain chapitre arrive bientôt.</p>
                    <Link to={`/manga/${slug}`} className="reader__chapter-index-btn">
                      <Settings size={15} />
                      Tous les chapitres
                    </Link>
                  </>
                )}
                <CommentsSection slug={slug} chapterNumber={chapterNum} />
              </div>
            ) : null}
          </>
        )}
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

          {nextChapterNum && (
            <Link
              to={`/manga/${slug}/chapter/${nextChapterNum}`}
              className="reader__chapter-nav-btn"
            >
              Ch. {nextChapterNum}
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
