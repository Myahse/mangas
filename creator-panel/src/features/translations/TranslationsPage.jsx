import { useEffect, useState } from 'react';
import { apiAssetUrl, creatorApi } from '../../services/api';
import { notify } from '../../services/notify';
import '../publications/PublicationsPage.css';

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Readers' contributions to my series, waiting for me: bubble translations (+2 coins each when
 * approved) and cultural notes (+3 coins).
 */
export default function TranslationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        void refreshKey;
        const [list, noteList, voiceList] = await Promise.all([
          creatorApi.listPendingTranslations(),
          creatorApi.listPendingNotes(),
          creatorApi.listPendingNarrations(),
        ]);
        if (!cancelled) {
          setItems(Array.isArray(list) ? list : []);
          setNotes(Array.isArray(noteList) ? noteList : []);
          setVoices(Array.isArray(voiceList) ? voiceList : []);
        }
      } catch (err) {
        if (!cancelled) notify.error(`Impossible de charger les contributions. ${(err && err.message) || ''}`.trim());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const review = async (item, approve) => {
    setBusyId(item.id);
    try {
      const res = approve ? await creatorApi.approveTranslation(item.id) : await creatorApi.rejectTranslation(item.id);
      setItems((list) => list.filter((x) => x.id !== item.id));
      if (approve) {
        notify.success(res?.rewardCoins
          ? `Traduction validée : ${item.translatorName} reçoit ${res.rewardCoins} coins.`
          : 'Traduction validée.');
      } else {
        notify.success('Traduction refusée.');
      }
    } catch (err) {
      notify.error((err && err.message) || 'Action impossible.');
    } finally {
      setBusyId('');
    }
  };

  const reviewNote = async (note, approve) => {
    setBusyId(note.id);
    try {
      const res = approve ? await creatorApi.approveNote(note.id) : await creatorApi.rejectNote(note.id);
      setNotes((list) => list.filter((x) => x.id !== note.id));
      if (approve) {
        notify.success(res?.rewardCoins
          ? `Note publiée : ${note.authorName} reçoit ${res.rewardCoins} coins.`
          : 'Note publiée.');
      } else {
        notify.success('Note refusée.');
      }
    } catch (err) {
      notify.error((err && err.message) || 'Action impossible.');
    } finally {
      setBusyId('');
    }
  };

  const reviewVoice = async (voice, approve) => {
    setBusyId(voice.id);
    try {
      const res = approve ? await creatorApi.approveNarration(voice.id) : await creatorApi.rejectNarration(voice.id);
      setVoices((list) => list.filter((x) => x.id !== voice.id));
      if (approve) {
        notify.success(res?.rewardCoins
          ? `Voix validée : ${voice.narratorName} reçoit ${res.rewardCoins} coins.`
          : 'Voix validée.');
      } else {
        notify.success('Voix refusée.');
      }
    } catch (err) {
      notify.error((err && err.message) || 'Action impossible.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="pub container">
      <h1 className="pub__title">Traductions</h1>
      <p className="pub__lead">
        Vos lecteurs traduisent vos bulles en wolof, dioula, swahili…, expliquent les plats, objets et proverbes de
        vos pages et prêtent leur voix au mode griot. Validez ce qui est juste : c’est publié dans le lecteur et
        l’auteur gagne des coins.
      </p>

      <div className="pub__actions" style={{ marginTop: 12 }}>
        <button type="button" className="pub__btn" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="pub__empty">Chargement…</div>
      ) : (
        <>
          <h2 className="pub__series" style={{ marginTop: 20 }}>Bulles traduites · {items.length} en attente</h2>
          {items.length === 0 ? (
            <div className="pub__empty">Aucune traduction en attente.</div>
          ) : (
            <div className="pub__grid">
              {items.map((it) => (
                <div key={it.id} className="pub__card">
                  <div className="pub__head">
                    <div>
                      <div className="pub__series">{it.seriesTitle} · Chapitre {it.chapterNumber} · page {it.page}</div>
                      <div className="pub__episode">{it.langName}</div>
                      <div className="pub__meta">Par {it.translatorName} · {formatWhen(it.createdAt)}</div>
                    </div>
                    <div className="pub__actions" style={{ marginTop: 0 }}>
                      <button
                        type="button"
                        className="pub__btn pub__btn--primary"
                        disabled={busyId === it.id}
                        onClick={() => review(it, true)}
                      >
                        Valider
                      </button>
                      <button type="button" className="pub__btn" disabled={busyId === it.id} onClick={() => review(it, false)}>
                        Refuser
                      </button>
                    </div>
                  </div>
                  {it.originalText ? <div className="pub__note">Original : {it.originalText}</div> : null}
                  <div className="pub__note"><strong>{it.langName} :</strong> {it.text}</div>
                  {it.currentApprovedText ? (
                    <div className="pub__meta">Remplacerait la traduction actuelle : {it.currentApprovedText}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <h2 className="pub__series" style={{ marginTop: 24 }}>Notes culturelles · {notes.length} en attente</h2>
          {notes.length === 0 ? (
            <div className="pub__empty">Aucune note en attente.</div>
          ) : (
            <div className="pub__grid">
              {notes.map((n) => (
                <div key={n.id} className="pub__card">
                  <div className="pub__head">
                    <div>
                      <div className="pub__series">{n.seriesTitle} · Chapitre {n.chapterNumber} · page {n.page}</div>
                      <div className="pub__episode">{n.title}</div>
                      <div className="pub__meta">Par {n.authorName} · {formatWhen(n.createdAt)}</div>
                    </div>
                    <div className="pub__actions" style={{ marginTop: 0 }}>
                      <button
                        type="button"
                        className="pub__btn pub__btn--primary"
                        disabled={busyId === n.id}
                        onClick={() => reviewNote(n, true)}
                      >
                        Publier
                      </button>
                      <button type="button" className="pub__btn" disabled={busyId === n.id} onClick={() => reviewNote(n, false)}>
                        Refuser
                      </button>
                    </div>
                  </div>
                  <div className="pub__note">{n.body}</div>
                </div>
              ))}
            </div>
          )}

          <h2 className="pub__series" style={{ marginTop: 24 }}>Voix pour le mode griot · {voices.length} en attente</h2>
          {voices.length === 0 ? (
            <div className="pub__empty">Aucune voix en attente.</div>
          ) : (
            <div className="pub__grid">
              {voices.map((v) => (
                <div key={v.id} className="pub__card">
                  <div className="pub__head">
                    <div>
                      <div className="pub__series">{v.seriesTitle} · Chapitre {v.chapterNumber} · page {v.page}</div>
                      <div className="pub__episode">{v.langName}</div>
                      <div className="pub__meta">
                        Par {v.narratorName} · {formatWhen(v.createdAt)}
                        {v.durationMs ? ` · ${Math.round(v.durationMs / 100) / 10} s` : ''}
                      </div>
                    </div>
                    <div className="pub__actions" style={{ marginTop: 0 }}>
                      <button
                        type="button"
                        className="pub__btn pub__btn--primary"
                        disabled={busyId === v.id}
                        onClick={() => reviewVoice(v, true)}
                      >
                        Valider
                      </button>
                      <button type="button" className="pub__btn" disabled={busyId === v.id} onClick={() => reviewVoice(v, false)}>
                        Refuser
                      </button>
                    </div>
                  </div>
                  <div className="pub__note">« {v.text} »</div>
                  <audio controls preload="none" src={apiAssetUrl(v.audioUrl)} style={{ width: '100%', marginTop: 8 }} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
