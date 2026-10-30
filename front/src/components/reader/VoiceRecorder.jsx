import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { fetchMyBubbleAudio, uploadBubbleAudio } from '../../services/api';
import { notify } from '../../services/notify';

const MAX_MS = 60_000;
const STATUS = {
  pending: 'Votre voix attend la validation du créateur.',
  approved: 'Votre voix est utilisée dans le mode griot.',
  rejected: 'Votre enregistrement a été refusé : vous pouvez réessayer.',
  superseded: 'Une autre voix a été choisie pour cette bulle.',
};

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    .find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
}

/** Records the reader's voice reading one bubble, for griot mode (+2 coins once approved). */
export default function VoiceRecorder({ bubbleId, lang, text }) {
  const [state, setState] = useState('idle'); // idle | recording | recorded | sending
  const [clip, setClip] = useState(null); // { blob, url, ms }
  const [myStatus, setMyStatus] = useState('');
  const recRef = useRef(null);
  const startRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setClip(null);
    setState('idle');
    fetchMyBubbleAudio(bubbleId, lang)
      .then((r) => { if (!cancelled) setMyStatus(r?.status || ''); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bubbleId, lang]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    recRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      notify.error('Ce navigateur ne permet pas d’enregistrer.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        setClip({ blob, url: URL.createObjectURL(blob), ms: Date.now() - startRef.current });
        setState('recorded');
      };
      recRef.current = rec;
      startRef.current = Date.now();
      rec.start();
      setState('recording');
      timerRef.current = setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_MS);
    } catch {
      notify.error('Micro indisponible : autorisez-le dans votre navigateur.');
    }
  };

  const stop = () => {
    clearTimeout(timerRef.current);
    if (recRef.current?.state === 'recording') recRef.current.stop();
  };

  const send = async () => {
    if (!clip) return;
    setState('sending');
    try {
      await uploadBubbleAudio(bubbleId, lang, clip.blob, clip.ms);
      setMyStatus('pending');
      setClip(null);
      setState('idle');
      notify.success('Voix envoyée : le créateur va l’écouter.');
    } catch (e) {
      notify.error(e?.message || 'Envoi impossible.');
      setState('recorded');
    }
  };

  return (
    <div className="translate__voice">
      <span className="translate__voice-label">Votre voix pour le mode griot</span>
      <p className="translate__original">« {text} »</p>
      {myStatus ? <p className={`translate__status translate__status--${myStatus}`}>{STATUS[myStatus] || myStatus}</p> : null}
      {state === 'recording' ? (
        <button type="button" className="reader__chapter-nav-btn" onClick={stop}>
          <Square size={14} /> Arrêter l’enregistrement
        </button>
      ) : (
        <button type="button" className="reader__chapter-index-btn" onClick={start} disabled={state === 'sending'}>
          <Mic size={14} /> {clip ? 'Recommencer' : 'Enregistrer ma voix'}
        </button>
      )}
      {clip ? (
        <>
          <audio controls src={clip.url} className="translate__voice-audio" />
          <button type="button" className="reader__chapter-nav-btn" onClick={send} disabled={state === 'sending'}>
            {state === 'sending' ? 'Envoi…' : 'Envoyer ma voix'}
          </button>
        </>
      ) : null}
      <p className="reader__lang-note">Chaque voix validée vous rapporte 2 coins.</p>
    </div>
  );
}
