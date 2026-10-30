import { useEffect, useMemo, useState } from 'react';
import { creatorApi } from '../../services/api';
import { notify } from '../../services/notify';
import '../publications/PublicationsPage.css';
import '../../pages/SeriesPage.css';

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const EMPTY_OPTIONS = ['', '', '', ''];

/**
 * "Les lecteurs votent la suite": ask readers what happens next at the end of a chapter. Each reader
 * has one free vote and can add votes with coins; close the poll to announce the winning choice.
 */
export default function PollsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [polls, setPolls] = useState([]);
  const [series, setSeries] = useState([]); // [{ slug, title, totalChapters }]
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState('');
  const [chapter, setChapter] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [closesAt, setClosesAt] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        void refreshKey;
        const [mine, subs, catalog] = await Promise.all([
          creatorApi.listMyPolls(),
          creatorApi.listMySubmissions(),
          creatorApi.listCatalog(),
        ]);
        if (cancelled) return;
        setPolls(Array.isArray(mine) ? mine : []);
        // My approved series that are in the public catalog (matched by title, like the backend does).
        const titles = new Set((Array.isArray(subs) ? subs : [])
          .filter((s) => String(s?.status || '').toLowerCase() === 'approved')
          .map((s) => String(s?.payload?.title || '').trim().toLowerCase()));
        setSeries((Array.isArray(catalog) ? catalog : [])
          .filter((m) => titles.has(String(m.title || '').trim().toLowerCase()))
          .map((m) => ({ slug: m.slug, title: m.title, totalChapters: m.totalChapters || 0 })));
      } catch (err) {
        if (!cancelled) notify.error(`Impossible de charger les sondages. ${(err && err.message) || ''}`.trim());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const chosen = useMemo(() => series.find((s) => s.slug === slug), [series, slug]);

  const create = async (e) => {
    e.preventDefault();
    const choices = options.map((o) => o.trim()).filter(Boolean);
    if (!slug || !chapter || !question.trim() || choices.length < 2) {
      notify.error('Choisissez une série, un chapitre, une question et au moins 2 choix.');
      return;
    }
    setBusy(true);
    try {
      await creatorApi.createPoll({
        slug,
        chapterNumber: Number(chapter),
        question: question.trim(),
        options: choices,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      });
      notify.success('Sondage publié : il apparaît à la fin du chapitre.');
      setQuestion('');
      setOptions(EMPTY_OPTIONS);
      setClosesAt('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      notify.error((err && err.message) || 'Création impossible.');
    } finally {
      setBusy(false);
    }
  };

  const close = async (poll) => {
    setBusy(true);
    try {
      const res = await creatorApi.closePoll(poll.id);
      const winner = res?.options?.find((o) => o.id === res.winnerOptionId);
      notify.success(winner ? `Sondage clos : « ${winner.label} » l’emporte.` : 'Sondage clos.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      notify.error((err && err.message) || 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pub container">
      <h1 className="pub__title">Sondages</h1>
      <p className="pub__lead">
        Laissez vos lecteurs choisir la suite. Chaque lecteur a un vote gratuit et peut ajouter des voix avec ses coins.
      </p>

      <form className="pub__card" style={{ marginTop: 16 }} onSubmit={create}>
        <div className="pub__series">Nouveau sondage</div>
        {series.length === 0 && !loading ? (
          <div className="pub__note">Aucune série publiée pour le moment : un sondage se pose sur un chapitre publié.</div>
        ) : null}
        <label className="creator__field">
          <span>Série</span>
          <select value={slug} onChange={(e) => { setSlug(e.target.value); setChapter(''); }}>
            <option value="">Choisir</option>
            {series.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
          </select>
        </label>
        <label className="creator__field">
          <span>Chapitre (le sondage s’affiche à sa fin)</span>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} disabled={!chosen}>
            <option value="">Choisir</option>
            {Array.from({ length: chosen?.totalChapters || 0 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>Chapitre {n}</option>
            ))}
          </select>
        </label>
        <label className="creator__field">
          <span>Question</span>
          <input value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 200))} placeholder="Que doit faire Awa ?" />
        </label>
        {options.map((o, i) => (
          <label key={i} className="creator__field">
            <span>Choix {i + 1}{i >= 2 ? ' (optionnel)' : ''}</span>
            <input
              value={o}
              onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? e.target.value.slice(0, 120) : x)))}
            />
          </label>
        ))}
        <label className="creator__field">
          <span>Fin du vote (optionnel)</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </label>
        <div className="pub__actions">
          <button type="submit" className="pub__btn pub__btn--primary" disabled={busy}>Publier le sondage</button>
        </div>
      </form>

      {loading ? (
        <div className="pub__empty">Chargement…</div>
      ) : polls.length === 0 ? (
        <div className="pub__empty">Aucun sondage pour le moment.</div>
      ) : (
        <div className="pub__grid">
          {polls.map((p) => (
            <div key={p.id} className="pub__card">
              <div className="pub__head">
                <div>
                  <div className="pub__series">{p.seriesTitle} · Chapitre {p.chapterNumber}</div>
                  <div className="pub__episode">{p.question}</div>
                  <div className="pub__meta">
                    {p.status === 'open' ? 'Ouvert' : 'Clos'} · {p.totalVotes ?? 0} votes
                    {p.closesAt ? ` · fin : ${formatWhen(p.closesAt)}` : ''}
                  </div>
                </div>
                {p.status === 'open' ? (
                  <div className="pub__actions" style={{ marginTop: 0 }}>
                    <button type="button" className="pub__btn" disabled={busy} onClick={() => close(p)}>
                      Clore et annoncer
                    </button>
                  </div>
                ) : null}
              </div>
              {p.options.map((o) => {
                const pct = p.totalVotes ? Math.round(((o.votes || 0) / p.totalVotes) * 100) : 0;
                return (
                  <div key={o.id} className="pub__note">
                    <strong>{p.winnerOptionId === o.id ? 'Gagnant · ' : ''}{o.label}</strong> · {o.votes ?? 0} votes ({pct}%)
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
