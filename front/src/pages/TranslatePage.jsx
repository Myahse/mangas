import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, SquareDashedMousePointer } from 'lucide-react';
import {
  useFetch,
  fetchMangaBySlug,
  fetchPages,
  fetchTranslationLanguages,
  fetchTranslatorBubbles,
  createBubble,
  deleteBubble,
  submitBubbleTranslation,
  fetchContributorNotes,
  createNote,
  deleteNote,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import VoiceRecorder from '../components/reader/VoiceRecorder';
import { notify } from '../services/notify';
import './ReaderPage.css';
import './TranslatePage.css';

const LANG_KEY = 'mangafric.translateLang';

const STATUS_LABEL = {
  pending: 'En attente de validation',
  approved: 'Validée',
  rejected: 'Refusée',
  superseded: 'Remplacée par une autre traduction',
};

/**
 * Community translation tool: draw a box over a speech bubble, write its text in an African
 * language, and send it for the series creator to approve (+2 coins per approved bubble).
 */
export default function TranslatePage() {
  const { slug, chapter } = useParams();
  const chapterNum = parseInt(chapter, 10);
  const { isAuthenticated } = useAuth();

  const { data: manga } = useFetch(fetchMangaBySlug, slug);
  const { data: pages, error: pagesError, loading: pagesLoading } = useFetch(fetchPages, slug, chapterNum, isAuthenticated);
  const { data: languages } = useFetch(fetchTranslationLanguages);
  const languageList = Array.isArray(languages) ? languages : [];

  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) || 'wo'; } catch { return 'wo'; }
  });
  const [bubblesKey, setBubblesKey] = useState(0);
  const { data: bubbles } = useFetch(
    (s, n, l, authed) => (authed ? fetchTranslatorBubbles(s, n, l) : Promise.resolve([])),
    slug, chapterNum, lang, isAuthenticated, bubblesKey,
  );
  const bubbleList = Array.isArray(bubbles) ? bubbles : [];

  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState(null); // box being drawn: { page, x0, y0, x, y, w, h }
  const [selected, setSelected] = useState(null); // existing bubble, or { isNew, page, x, y, w, h }
  const [originalText, setOriginalText] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);

  const pageList = pagesLoading || pagesError ? [] : (Array.isArray(pages) ? pages : []);
  const langName = languageList.find((l) => l.code === lang)?.name || lang;

  /* Mode: translate bubbles, or add cultural notes (?mode=notes) */
  const [searchParams, setSearchParams] = useSearchParams();
  const notesMode = searchParams.get('mode') === 'notes';
  const setMode = (notes) => {
    setSelected(null);
    setDrawing(false);
    setSearchParams(notes ? { mode: 'notes' } : {}, { replace: true });
  };
  const [notesKey, setNotesKey] = useState(0);
  const { data: notes } = useFetch(
    (s, n, authed) => (authed ? fetchContributorNotes(s, n) : Promise.resolve([])),
    slug, chapterNum, isAuthenticated, notesKey,
  );
  const noteList = Array.isArray(notes) ? notes : [];
  const [noteTitle, setNoteTitle] = useState('');

  useEffect(() => {
    if (!selected || selected.isNew || notesMode) return;
    const fresh = bubbleList.find((b) => b.id === selected.id);
    if (fresh) setSelected(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbles]);

  const chooseLang = (code) => {
    setLang(code);
    setSelected(null);
    try { localStorage.setItem(LANG_KEY, code); } catch {}
  };

  const openBubble = (b) => {
    setSelected(b);
    setOriginalText(b.originalText || '');
    setText(b.myText || '');
  };

  /* Drawing a box, in % of the page image */
  const pointAt = (e, el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  };
  const onPointerDown = (e, page) => {
    if (!drawing) return;
    e.preventDefault();
    const el = e.currentTarget;
    if (el.getBoundingClientRect().width <= 0) return; // page not laid out yet

    try { el.setPointerCapture(e.pointerId); } catch { /* keeps working without capture */ }
    const p = pointAt(e, el);
    dragRef.current = { el, page, x0: p.x, y0: p.y };
    setDraft({ page, x: p.x, y: p.y, w: 0, h: 0 });
  };
  const boxFrom = (d, p) => ({
    page: d.page,
    x: Math.min(d.x0, p.x), y: Math.min(d.y0, p.y),
    w: Math.abs(p.x - d.x0), h: Math.abs(p.y - d.y0),
  });
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    setDraft(boxFrom(d, pointAt(e, d.el)));
  };
  const onPointerUp = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    // From the release point, not the draft state: the last move may not have rendered yet.
    const box = boxFrom(d, pointAt(e, d.el));
    setDraft(null);
    if (box.w < 2 || box.h < 2) return;
    setSelected({ isNew: true, isNote: notesMode, ...box });
    setOriginalText('');
    setNoteTitle('');
    setText('');
    setDrawing(false);
  };

  const saveNote = async () => {
    if (!noteTitle.trim() || !text.trim()) {
      notify.error('Donnez un titre et une explication à la note.');
      return;
    }
    setSaving(true);
    try {
      const round = (v) => Math.round(v * 1000) / 1000;
      const created = await createNote(slug, chapterNum, {
        page: selected.page,
        x: round(selected.x), y: round(selected.y), w: round(selected.w), h: round(selected.h),
        title: noteTitle.trim(),
        body: text.trim(),
      });
      setSelected({ ...created, isNote: true });
      setNotesKey((k) => k + 1);
      notify.success(created.status === 'approved'
        ? 'Note publiée.'
        : 'Note envoyée : le créateur va la relire.');
    } catch (e) {
      notify.error(e?.message || 'Envoi impossible.');
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async () => {
    if (!selected?.id || !window.confirm('Supprimer cette note ?')) return;
    try {
      await deleteNote(selected.id);
      setSelected(null);
      setNotesKey((k) => k + 1);
    } catch (e) {
      notify.error(e?.message?.includes('not allowed')
        ? 'Seul le créateur peut supprimer une note déjà publiée.'
        : (e?.message || 'Suppression impossible.'));
    }
  };

  const save = async () => {
    if (notesMode) return saveNote();
    if (!text.trim()) {
      notify.error('Écrivez la traduction avant d’envoyer.');
      return;
    }
    setSaving(true);
    try {
      let bubbleId = selected.id;
      if (selected.isNew) {
        const round = (v) => Math.round(v * 1000) / 1000;
        const created = await createBubble(slug, chapterNum, {
          page: selected.page,
          x: round(selected.x), y: round(selected.y), w: round(selected.w), h: round(selected.h),
          originalText: originalText.trim() || null,
        });
        bubbleId = created.id;
      }
      const saved = await submitBubbleTranslation(bubbleId, lang, text.trim());
      setSelected(saved);
      setBubblesKey((k) => k + 1);
      notify.success('Traduction envoyée : le créateur va la relire.');
    } catch (e) {
      notify.error(e?.message || 'Envoi impossible.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected?.id || !window.confirm('Supprimer cette bulle ?')) return;
    try {
      await deleteBubble(selected.id);
      setSelected(null);
      setBubblesKey((k) => k + 1);
    } catch (e) {
      notify.error(e?.message?.includes('not allowed')
        ? 'Seul le créateur peut supprimer une bulle déjà traduite.'
        : (e?.message || 'Suppression impossible.'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="reader-notfound">
        <p>Connectez-vous pour traduire ce chapitre.</p>
        <Link to={`/manga/${slug}/chapter/${chapterNum}`}>Retour</Link>
      </div>
    );
  }

  const byPage = {};
  bubbleList.forEach((b) => { (byPage[b.page] ||= []).push(b); });
  const translatedCount = bubbleList.filter((b) => b.approvedText).length;
  const notesByPage = {};
  noteList.forEach((n) => { (notesByPage[n.page] ||= []).push(n); });

  return (
    <div className="reader reader--dark">
      <div className="reader__topbar reader__topbar--visible">
        <div className="reader__topbar-left">
          <Link to={`/manga/${slug}/chapter/${chapterNum}`} className="reader__back-btn">
            <ArrowLeft size={18} />
            <span className="reader__back-title">{manga?.title || slug}</span>
          </Link>
        </div>
        <div className="reader__topbar-center">
          <span className="reader__chapter-label">
            {notesMode ? 'Notes culturelles' : 'Traduire'} · Chapitre {chapterNum}
          </span>
          <span className="reader__page-label">
            {notesMode
              ? `${noteList.filter((n) => n.status === 'approved').length} notes publiées`
              : `${translatedCount}/${bubbleList.length} bulles en ${langName}`}
          </span>
        </div>
        <div className="reader__topbar-right">
          <select
            className="translate__lang-select"
            value={notesMode ? 'notes' : 'bubbles'}
            onChange={(e) => setMode(e.target.value === 'notes')}
            aria-label="Type de contribution"
          >
            <option value="bubbles">Bulles</option>
            <option value="notes">Notes culturelles</option>
          </select>
          {!notesMode ? (
            <select
              className="translate__lang-select"
              value={lang}
              onChange={(e) => chooseLang(e.target.value)}
              aria-label="Langue de traduction"
            >
              {languageList.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          ) : null}
          <button
            className={`reader__ctrl-btn${drawing ? ' reader__ctrl-btn--active' : ''}`}
            onClick={() => { setDrawing((d) => !d); setSelected(null); }}
            title={notesMode ? 'Entourer un élément à expliquer' : 'Dessiner une bulle'}
            aria-label={notesMode ? 'Entourer un élément à expliquer' : 'Dessiner une bulle'}
            aria-pressed={drawing}
          >
            <SquareDashedMousePointer size={16} />
          </button>
        </div>
      </div>

      {selected && notesMode && (
        <div className="reader__chapter-panel">
          <div className="reader__chapter-panel-header">
            <h3>{selected.isNew ? 'Nouvelle note' : `Note · page ${selected.page}`}</h3>
            <button onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="translate__panel">
            {selected.isNew ? (
              <>
                <label className="translate__field">
                  <span>Titre (ex. : L’attiéké, Le masque Gouro…)</span>
                  <textarea rows={1} value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} maxLength={80} />
                </label>
                <label className="translate__field">
                  <span>Explication</span>
                  <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
                </label>
                <button type="button" className="reader__chapter-nav-btn" disabled={saving} onClick={save}>
                  {saving ? 'Envoi…' : 'Envoyer la note'}
                </button>
              </>
            ) : (
              <>
                <p className="translate__original"><strong>{selected.title}</strong></p>
                <p className="translate__approved">{selected.body}</p>
                {selected.status ? (
                  <p className={`translate__status translate__status--${selected.status}`}>
                    {selected.status === 'approved' ? 'Publiée' : STATUS_LABEL[selected.status] || selected.status}
                  </p>
                ) : null}
                <button type="button" className="reader__chapter-index-btn" onClick={removeNote}>Supprimer la note</button>
              </>
            )}
            <p className="reader__lang-note">Chaque note validée par le créateur vous rapporte 3 coins.</p>
          </div>
        </div>
      )}

      {selected && !notesMode && (
        <div className="reader__chapter-panel">
          <div className="reader__chapter-panel-header">
            <h3>{selected.isNew ? 'Nouvelle bulle' : `Bulle · page ${selected.page}`}</h3>
            <button onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="translate__panel">
            {selected.isNew ? (
              <label className="translate__field">
                <span>Texte original (facultatif)</span>
                <textarea rows={2} value={originalText} onChange={(e) => setOriginalText(e.target.value)} />
              </label>
            ) : selected.originalText ? (
              <p className="translate__original">« {selected.originalText} »</p>
            ) : null}
            {selected.approvedText ? (
              <p className="translate__approved">Traduction actuelle : {selected.approvedText}</p>
            ) : null}
            <label className="translate__field">
              <span>Votre traduction en {langName}</span>
              <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={600} />
            </label>
            {selected.myStatus ? (
              <p className={`translate__status translate__status--${selected.myStatus}`}>
                {STATUS_LABEL[selected.myStatus] || selected.myStatus}
              </p>
            ) : null}
            <button type="button" className="reader__chapter-nav-btn" disabled={saving} onClick={save}>
              {saving ? 'Envoi…' : 'Envoyer pour validation'}
            </button>
            {!selected.isNew ? (
              <button type="button" className="reader__chapter-index-btn" onClick={remove}>Supprimer la bulle</button>
            ) : null}
            <p className="reader__lang-note">Chaque bulle validée par le créateur vous rapporte 2 coins.</p>
            {/* Griot voice: read the approved translation, or the original text when there is none yet */}
            {!selected.isNew && (selected.approvedText || selected.originalText) ? (
              <VoiceRecorder
                bubbleId={selected.id}
                lang={selected.approvedText ? lang : 'orig'}
                text={selected.approvedText || selected.originalText}
              />
            ) : null}
          </div>
        </div>
      )}

      <div className="reader__scroll-mode">
        {drawing ? (
          <p className="translate__hint">
            {notesMode
              ? 'Faites glisser sur l’objet, le plat ou le symbole à expliquer.'
              : 'Faites glisser sur une bulle de la page pour l’entourer.'}
          </p>
        ) : null}
        {pagesError ? (
          <div className="reader-notfound" style={{ padding: 24 }}>
            <p>Ce chapitre doit être débloqué pour être traduit.</p>
            <Link to={`/manga/${slug}/chapter/${chapterNum}`}>Retour</Link>
          </div>
        ) : null}
        {pageList.map((p, i) => (
          <div
            key={p.url}
            className={`reader__scroll-item${drawing ? ' translate__page--drawing' : ''}`}
            onPointerDown={(e) => onPointerDown(e, i + 1)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img
              src={p.url}
              alt={`Page ${i + 1}`}
              className="reader__scroll-page"
              loading="lazy"
              draggable={false}
              onLoad={(e) => e.currentTarget.classList.add('reader__scroll-page--loaded')}
            />
            {notesMode && (notesByPage[i + 1] || []).map((n) => (
              <button
                key={n.id}
                type="button"
                className={`translate__box translate__box--note${n.status === 'pending' ? ' translate__box--pending' : ''}${selected?.id === n.id ? ' translate__box--selected' : ''}`}
                style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${n.w}%`, height: `${n.h}%` }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => !drawing && setSelected({ ...n, isNote: true })}
                aria-label={`Note : ${n.title}`}
              />
            ))}
            {!notesMode && (byPage[i + 1] || []).map((b) => {
              const state = b.myStatus === 'pending' ? 'pending' : b.approvedText ? 'approved' : 'todo';
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`translate__box translate__box--${state}${selected?.id === b.id ? ' translate__box--selected' : ''}`}
                  style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => !drawing && openBubble(b)}
                  aria-label={`Bulle page ${b.page}`}
                />
              );
            })}
            {draft && draft.page === i + 1 ? (
              <span
                className="translate__box translate__box--selected"
                style={{ left: `${draft.x}%`, top: `${draft.y}%`, width: `${draft.w}%`, height: `${draft.h}%` }}
              />
            ) : null}
            {selected?.isNew && selected.page === i + 1 ? (
              <span
                className="translate__box translate__box--selected"
                style={{ left: `${selected.x}%`, top: `${selected.y}%`, width: `${selected.w}%`, height: `${selected.h}%` }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
