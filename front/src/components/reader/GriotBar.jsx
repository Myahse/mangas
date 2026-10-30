import { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { apiAssetUrl } from '../../services/api';

/* BCP-47 tags for the browser's speech voices. Most systems only have French and English voices;
   for other languages the step falls back to silent reading at the pace of the text. */
const SPEECH_TAGS = { orig: 'fr', en: 'en', sw: 'sw', yo: 'yo', ha: 'ha', ee: 'ee', ff: 'ff', wo: 'wo', ln: 'ln', bm: 'bm' };

function pickVoice(lang) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const tag = SPEECH_TAGS[lang];
  if (!tag) return null;
  return window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(tag)) || null;
}

/** Reading time when nothing can be heard: about 3 words per second, at least 1.8 s. */
export function silentDurationMs(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1800, words * 330);
}

/**
 * Griot mode: tells the chapter bubble by bubble. For each step it plays the recorded voice, else a
 * speech voice of the browser for that language, else waits for the reading time; then moves on.
 * onStep(index) lets the reader scroll to and highlight the bubble.
 */
export default function GriotBar({ steps, lang, onStep, onClose }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [source, setSource] = useState('');
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const step = steps[index];

  const stopAll = () => {
    clearTimeout(timerRef.current);
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    try { window.speechSynthesis?.cancel(); } catch {}
  };

  useEffect(() => {
    try { window.speechSynthesis?.getVoices(); } catch {} // some browsers load voices on first call
    return () => stopAll();
  }, []);

  useEffect(() => {
    if (step) onStep?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    stopAll();
    if (!step || !playing) return undefined;
    let done = false;
    const next = () => {
      if (done) return;
      done = true;
      if (index < steps.length - 1) setIndex(index + 1);
      else setPlaying(false);
    };
    // Every fallback checks `done`: a cancelled run (step changed, pause, StrictMode re-run) must not
    // start sound or overwrite the label of the run that replaced it.
    const silent = () => {
      if (done) return;
      setSource('Lecture silencieuse');
      timerRef.current = setTimeout(next, silentDurationMs(step.text));
    };
    const speak = () => {
      if (done) return undefined;
      const voice = pickVoice(lang);
      if (!voice || !window.SpeechSynthesisUtterance) return silent();
      setSource('Voix de synthèse');
      const u = new window.SpeechSynthesisUtterance(step.text);
      u.voice = voice;
      u.lang = voice.lang;
      u.onend = next;
      u.onerror = () => { if (!done) silent(); };
      window.speechSynthesis.speak(u);
      return undefined;
    };
    if (step.audioUrl) {
      setSource('Voix enregistrée');
      const audio = new Audio(apiAssetUrl(step.audioUrl));
      audioRef.current = audio;
      audio.onended = next;
      audio.onerror = () => speak();
      audio.play().catch(() => speak());
    } else {
      speak();
    }
    return () => { done = true; stopAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing, steps]);

  if (!step) return null;

  return (
    <div className="reader__griot" role="region" aria-label="Mode griot">
      <div className="reader__griot-text">
        <span className="reader__griot-meta">
          Bulle {index + 1}/{steps.length} · page {step.page}{source ? ` · ${source}` : ''}
        </span>
        <p>{step.text}</p>
      </div>
      <div className="reader__griot-controls">
        <button type="button" className="reader__ctrl-btn" onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0} aria-label="Bulle précédente">
          <SkipBack size={16} />
        </button>
        <button type="button" className="reader__ctrl-btn reader__ctrl-btn--active" onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Lecture'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" className="reader__ctrl-btn" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
          disabled={index >= steps.length - 1} aria-label="Bulle suivante">
          <SkipForward size={16} />
        </button>
        <button type="button" className="reader__ctrl-btn" onClick={() => { stopAll(); onClose?.(); }} aria-label="Quitter le mode griot">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
