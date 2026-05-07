import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import {
  createSupportTicket,
  fetchSupportTicketMessages,
  sendSupportTicketMessage,
  storageObjectUrl,
  uploadSupportPublicAttachment,
} from '../services/api.js';
import './ContactPage.css';

function normalizeTicketRef(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('(') && s.endsWith(')'))) {
    s = s.slice(1, -1).trim();
  }
  // Postgres JDBC returns UUID text lower-case; normalize so STOMP topics match.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  return s;
}

function messagesFingerprint(rows) {
  try {
    return JSON.stringify(
      (Array.isArray(rows) ? rows : []).map((m) => ({
        id: m?.id,
        from: m?.from,
        text: m?.text,
        at: m?.at,
        attachmentKey: m?.attachmentKey,
      })),
    );
  } catch {
    return '';
  }
}

function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/'));
}

function PaperclipGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
      />
    </svg>
  );
}

function DocThumbGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function AccordionItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="contact-acc__item">
      <button className="contact-acc__q" type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span>{q}</span>
        <span className="contact-acc__chev">{isOpen ? '–' : '+'}</span>
      </button>
      {isOpen ? <div className="contact-acc__a">{a}</div> : null}
    </div>
  );
}

export default function ContactPage() {
  const [openIdx, setOpenIdx] = useState(0);
  const [tab, setTab] = useState('faq'); // faq | ticket | chat

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    description: '',
    type: 'issue',
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const [chatTicketId, setChatTicketId] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [chatAttachment, setChatAttachment] = useState(null);
  const attachmentPreviewUrl = useMemo(() => {
    if (!chatAttachment || !isImageFile(chatAttachment)) return null;
    return URL.createObjectURL(chatAttachment);
  }, [chatAttachment]);
  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [supportTyping, setSupportTyping] = useState(false);
  const userIsTyping = tab === 'chat' && (Boolean(chatDraft.trim()) || Boolean(chatAttachment));
  const stompRef = useRef(null);
  const [stompConnected, setStompConnected] = useState(false);
  const supportTypingTimerRef = useRef(null);
  const sendTypingTimerRef = useRef(null);
  const chatScrollRef = useRef(null);
  /** When true, new messages / typing keep the view pinned to the bottom */
  const chatStickBottomRef = useRef(true);
  const TYPING_IDLE_MS = 2200;
  const REMOTE_TYPING_HIDE_MS = 3500;
  /** REST catch-up if STOMP disconnects or a frame is missed (messages also push on `/topic/.../messages`). */
  const CHAT_POLL_FALLBACK_MS = 5000;

  const scrollChatToBottom = useCallback((options) => {
    const force = options?.force === true;
    if (force) {
      chatStickBottomRef.current = true;
    } else if (!chatStickBottomRef.current) {
      return;
    }
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
  }, []);

  const onChatTranscriptScroll = useCallback(() => {
    if (userIsTyping || supportTyping) {
      chatStickBottomRef.current = true;
      return;
    }
    const el = chatScrollRef.current;
    if (!el) return;
    const threshold = 80;
    chatStickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, [userIsTyping, supportTyping]);

  const faqs = useMemo(
    () => [
      {
        q: "Je n'arrive pas à me connecter",
        a: (
          <div>
            <p>Vérifie d’abord ton email/mot de passe, puis essaie de rafraîchir la page.</p>
            <p>
              Si le problème continue, envoie-nous un ticket avec le message d’erreur et ton appareil
              (mobile/PC).
            </p>
          </div>
        ),
      },
      {
        q: "Une page/chapitre ne charge pas",
        a: (
          <div>
            <p>Essaie de recharger, puis de vider le cache du navigateur.</p>
            <p>Si ça persiste, indique le manga + le numéro de chapitre dans un ticket.</p>
          </div>
        ),
      },
      {
        q: 'Je veux signaler un bug ou faire une demande',
        a: (
          <div>
            <p>Utilise l’onglet “Envoyer un ticket”. Plus tu donnes de détails, plus on va vite.</p>
          </div>
        ),
      },
      {
        q: "Chat en direct : comment ça marche ?",
        a: (
          <div>
            <p>
              Le chat démarre en créant un ticket “chat”. Un agent te répondra dès qu’il est dispo.
            </p>
          </div>
        ),
      },
    ],
    [],
  );

  async function submit(typeOverride) {
    setError('');
    setSuccess(null);
    const payload = {
      type: typeOverride || form.type,
      name: form.name,
      email: form.email,
      subject: form.subject,
      description: form.description,
    };
    if (!String(payload.description || '').trim()) {
      setError('Merci de décrire ton problème / ta demande.');
      return;
    }
    setSending(true);
    try {
      const created = await createSupportTicket(payload);
      setSuccess(created);
      if ((typeOverride || form.type) === 'chat') setChatTicketId(normalizeTicketRef(created?.id || ''));
      setForm((f) => ({ ...f, subject: '', description: '' }));
    } catch (e) {
      setError(e?.message || "Impossible d'envoyer le ticket.");
    } finally {
      setSending(false);
    }
  }

  async function loadMessages({ silent } = { silent: false }) {
    const id = normalizeTicketRef(chatTicketId);
    if (tab !== 'chat' || !id) return;
    if (!silent) setChatLoading(true);
    setChatError('');
    try {
      const rows = await fetchSupportTicketMessages(id, Date.now());
      const next = Array.isArray(rows) ? rows : [];
      const fp = messagesFingerprint(next);
      setChatMsgs((prev) => (messagesFingerprint(prev) === fp ? prev : next));
    } catch (e) {
      setChatError(e?.message || 'Impossible de charger la conversation.');
    } finally {
      if (!silent) setChatLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== 'chat') return;
    if (!normalizeTicketRef(chatTicketId)) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadMessages({ silent: false });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, chatTicketId]);

  useEffect(() => {
    if (tab !== 'chat') return;
    if (!normalizeTicketRef(chatTicketId)) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      await loadMessages({ silent: true });
    };

    const id = window.setInterval(tick, CHAT_POLL_FALLBACK_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, chatTicketId]);

  async function sendChat() {
    const id = normalizeTicketRef(chatTicketId);
    const text = chatDraft.trim();
    if (!id) {
      setChatError('Ajoute une référence de ticket.');
      return;
    }
    if (!text && !chatAttachment) return;
    chatStickBottomRef.current = true;
    setChatError('');
    try {
      let attachmentKey;
      let attachmentName;
      let attachmentContentType;
      if (chatAttachment) {
        const up = await uploadSupportPublicAttachment(id, chatAttachment);
        attachmentKey = up.key;
        attachmentName = up.fileName;
        attachmentContentType = up.contentType;
      }
      await sendSupportTicketMessage(id, {
        from: 'user',
        text: text || '',
        ...(attachmentKey
          ? { attachmentKey, attachmentName, attachmentContentType }
          : {}),
      });
      setChatDraft('');
      setChatAttachment(null);
      await loadMessages({ silent: true });
    } catch (e) {
      setChatError(e?.message || 'Impossible d’envoyer le message.');
    }
  }

  useEffect(() => {
    if (tab === 'chat' && normalizeTicketRef(chatTicketId)) {
      chatStickBottomRef.current = true;
    }
  }, [tab, chatTicketId]);

  useEffect(() => {
    if (tab !== 'chat') return;
    const forceFollow = userIsTyping || supportTyping;
    if (forceFollow) chatStickBottomRef.current = true;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollChatToBottom({ force: forceFollow }));
    });
    return () => cancelAnimationFrame(id);
  }, [tab, chatMsgs, supportTyping, chatLoading, userIsTyping, scrollChatToBottom]);

  useEffect(() => {
    const id = normalizeTicketRef(chatTicketId);
    if (tab !== 'chat' || !id) {
      setSupportTyping(false);
      setStompConnected(false);
      try {
        stompRef.current?.deactivate();
      } catch {}
      stompRef.current = null;
      return () => {};
    }

    let cancelled = false;
    let stomp = null;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    let token = '';
    try {
      const key = String(import.meta.env.VITE_SESSION_STORAGE_KEY || '').trim();
      const raw = key ? localStorage.getItem(key) : null;
      token = raw ? (JSON.parse(raw)?.token || '') : '';
    } catch {}

    try {
      const api = new URL(String(API_BASE_URL || '').trim());
      const wsProtocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
      const brokerURL = `${wsProtocol}//${api.host}/ws`;

      stomp = new Client({
        brokerURL,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 600,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          if (cancelled) return;
          setStompConnected(true);
          stomp.subscribe(`/topic/support/tickets/${id}/typing`, (msg) => {
            if (cancelled) return;
            try {
              const evt = JSON.parse(msg.body || '{}');
              if (evt?.ticketId !== id) return;
              if (evt?.from !== 'support') return;
              const typing = Boolean(evt?.typing);
              setSupportTyping(typing);
              if (supportTypingTimerRef.current) window.clearTimeout(supportTypingTimerRef.current);
              if (typing) {
                supportTypingTimerRef.current = window.setTimeout(
                  () => setSupportTyping(false),
                  REMOTE_TYPING_HIDE_MS,
                );
              }
            } catch {}
          });
          stomp.subscribe(`/topic/support/tickets/${id}/messages`, (msg) => {
            if (cancelled) return;
            try {
              const m = JSON.parse(msg.body || '{}');
              if (!m?.id) return;
              setChatMsgs((prev) => {
                if (prev.some((x) => x.id === m.id)) return prev;
                const row = {
                  id: m.id,
                  from: m.from,
                  text: m.text != null ? String(m.text) : '',
                  at: m.at,
                  attachmentKey: m.attachmentKey,
                  attachmentName: m.attachmentName,
                  attachmentContentType: m.attachmentContentType,
                };
                const next = [...prev, row];
                next.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
                return next;
              });
            } catch {}
          });
        },
      });

      stompRef.current = stomp;
      setStompConnected(false);
      stomp.activate();
    } catch {}

    return () => {
      cancelled = true;
      if (supportTypingTimerRef.current) window.clearTimeout(supportTypingTimerRef.current);
      supportTypingTimerRef.current = null;
      try {
        stompRef.current?.deactivate();
      } catch {}
      stompRef.current = null;
      setStompConnected(false);
    };
  }, [tab, chatTicketId]);

  useEffect(() => {
    const id = normalizeTicketRef(chatTicketId);
    if (tab !== 'chat' || !id) return;
    if (!stompConnected) return;

    const publishTyping = (typing) => {
      try {
        stompRef.current?.publish({
          destination: '/app/support/typing',
          body: JSON.stringify({ ticketId: id, from: 'user', typing, at: new Date().toISOString() }),
        });
      } catch {}
    };

    if (sendTypingTimerRef.current) window.clearTimeout(sendTypingTimerRef.current);
    if (userIsTyping) {
      publishTyping(true);
      sendTypingTimerRef.current = window.setTimeout(() => publishTyping(false), TYPING_IDLE_MS);
    } else {
      publishTyping(false);
    }
  }, [tab, chatTicketId, userIsTyping, stompConnected, chatDraft]);

  return (
    <div className="contact-page container">
      <div className="contact-hero">
        <h1>Nous contacter</h1>
        <p className="contact-muted">
          Une question ? Un souci ? Pas de stress — on peut souvent résoudre ça en 2 minutes.
        </p>
      </div>

      <div className="contact-tabs">
        <button
          type="button"
          className={tab === 'faq' ? 'contact-tab contact-tab--active' : 'contact-tab'}
          onClick={() => setTab('faq')}
        >
          FAQ
        </button>
        <button
          type="button"
          className={tab === 'ticket' ? 'contact-tab contact-tab--active' : 'contact-tab'}
          onClick={() => setTab('ticket')}
        >
          Envoyer un ticket
        </button>
        <button
          type="button"
          className={tab === 'chat' ? 'contact-tab contact-tab--active' : 'contact-tab'}
          onClick={() => setTab('chat')}
        >
          Live chat
        </button>
      </div>

      {tab === 'faq' ? (
        <div className="contact-card">
          <div className="contact-card__title">Questions fréquentes</div>
          <div className="contact-acc">
            {faqs.map((f, idx) => (
              <AccordionItem
                key={f.q}
                q={f.q}
                a={f.a}
                isOpen={openIdx === idx}
                onToggle={() => setOpenIdx((cur) => (cur === idx ? -1 : idx))}
              />
            ))}
          </div>
          <div className="contact-muted" style={{ marginTop: 12 }}>
            Tu n’as pas trouvé ? Passe sur “Envoyer un ticket”.
          </div>
        </div>
      ) : null}

      {tab === 'ticket' ? (
        <div className="contact-card">
          <div className="contact-card__title">Créer un ticket support</div>
          <div className="contact-grid">
            <div>
              <label className="contact-label">Nom</label>
              <input
                className="contact-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ton nom"
              />
            </div>
            <div>
              <label className="contact-label">Email</label>
              <input
                className="contact-input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="toi@email.com"
              />
            </div>
            <div>
              <label className="contact-label">Type</label>
              <select
                className="contact-input"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="issue">Problème</option>
                <option value="request">Demande</option>
                <option value="chat">Chat</option>
              </select>
            </div>
            <div>
              <label className="contact-label">Sujet</label>
              <input
                className="contact-input"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Ex: chapitre ne charge pas"
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="contact-label">Message</label>
            <textarea
              className="contact-textarea"
              rows={6}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Explique-nous ce qui se passe, et si possible : manga + chapitre + appareil."
            />
          </div>

          {error ? <div className="contact-error">{error}</div> : null}
          {success ? (
            <div className="contact-success">
              Ticket envoyé. Référence: <code>{success.id}</code>
            </div>
          ) : null}

          <div className="contact-actions">
            <button className="contact-btn" type="button" onClick={() => submit()} disabled={sending}>
              {sending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'chat' ? (
        <div className="contact-card">
          <div className="contact-card__title">Live chat (ticket)</div>
          <p className="contact-muted" style={{ marginTop: 8 }}>
            On lance le chat en créant un ticket “chat”. Un agent te répond dès qu’il est disponible.
          </p>
          <div style={{ marginTop: 12 }}>
            <button
              className="contact-btn"
              type="button"
              onClick={() => {
                setForm((f) => ({ ...f, type: 'chat', subject: f.subject || 'Live chat', description: f.description }));
                submit('chat');
              }}
              disabled={sending}
            >
              {sending ? 'Démarrage…' : 'Démarrer un chat'}
            </button>
          </div>
          {error ? <div className="contact-error">{error}</div> : null}
          {success ? (
            <div className="contact-success" style={{ marginTop: 12 }}>
              Chat créé. Référence: <code>{success.id}</code>
            </div>
          ) : null}

          <div style={{ marginTop: 14 }}>
            <label className="contact-label">Référence ticket (pour reprendre un chat)</label>
            <input
              className="contact-input"
              value={chatTicketId}
              onChange={(e) => setChatTicketId(normalizeTicketRef(e.target.value))}
              placeholder="Colle la référence du ticket…"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              ref={chatScrollRef}
              className="contact-chat-transcript"
              onScroll={onChatTranscriptScroll}
            >
              {chatLoading ? (
                <div className="contact-muted">Chargement…</div>
              ) : normalizeTicketRef(chatTicketId) ? (
                chatMsgs.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {chatMsgs.map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.from === 'support' ? 'flex-start' : 'flex-end' }}>
                        <div
                          style={{
                            maxWidth: '80%',
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: m.from === 'support' ? 'rgba(0,0,0,0.06)' : 'rgba(255,106,0,0.12)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            fontWeight: 650,
                            lineHeight: 1.35,
                          }}
                        >
                          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                            {m.from === 'support' ? 'Support' : 'Vous'} · {m.at ? new Date(m.at).toLocaleString() : ''}
                          </div>
                          {m.text ? <div>{m.text}</div> : null}
                          {m.attachmentKey ? (
                            <div style={{ marginTop: m.text ? 8 : 0 }}>
                              {m.attachmentContentType && String(m.attachmentContentType).startsWith('image/') ? (
                                <a
                                  href={storageObjectUrl(m.attachmentKey)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={storageObjectUrl(m.attachmentKey)}
                                    alt=""
                                    style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, display: 'block' }}
                                  />
                                </a>
                              ) : (
                                <a
                                  className="contact-attachment-link"
                                  href={storageObjectUrl(m.attachmentKey)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {m.attachmentName || 'Pièce jointe'}
                                </a>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="contact-muted">Aucun message pour le moment.</div>
                )
              ) : (
                <div className="contact-muted">Crée un chat ou colle une référence pour voir la conversation.</div>
              )}

              {supportTyping ? (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10 }}>
                  <div className="contact-typing" aria-live="polite" aria-label="Le support est en train d’écrire">
                    <span className="contact-typing__dots" aria-hidden="true">
                      <span className="contact-typing__dot" />
                      <span className="contact-typing__dot" />
                      <span className="contact-typing__dot" />
                    </span>
                    <span className="contact-typing__label">Écrit…</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {chatError ? <div className="contact-error" style={{ marginTop: 10 }}>{chatError}</div> : null}

          <div className="contact-chat-compose-row">
            <div className="contact-chat-composer">
              <label className="contact-chat-composer__attach" title="Joindre un fichier">
                <input
                  type="file"
                  className="contact-chat-composer__file-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setChatAttachment(f || null);
                    e.target.value = '';
                  }}
                />
                <span className="contact-chat-composer__attach-icon">
                  <PaperclipGlyph />
                </span>
              </label>
              {chatAttachment ? (
                <div className="contact-chat-composer__preview">
                  {attachmentPreviewUrl ? (
                    <img src={attachmentPreviewUrl} alt="" className="contact-chat-composer__thumb" />
                  ) : (
                    <span className="contact-chat-composer__doc-thumb">
                      <DocThumbGlyph />
                    </span>
                  )}
                  <span className="contact-chat-composer__preview-meta">
                    <span className="contact-chat-composer__preview-name">{chatAttachment.name}</span>
                    <span className="contact-chat-composer__preview-hint">
                      {isImageFile(chatAttachment) ? 'Image' : 'Document'}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="contact-chat-composer__preview-remove"
                    onClick={() => setChatAttachment(null)}
                    aria-label="Retirer le fichier"
                  >
                    ×
                  </button>
                </div>
              ) : null}
              <input
                className="contact-chat-composer__field"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder={chatAttachment ? 'Légende (optionnel)…' : 'Écris un message…'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
            </div>
            <button
              className="contact-btn contact-chat-compose-row__send"
              type="button"
              onClick={sendChat}
              disabled={!normalizeTicketRef(chatTicketId) || (!chatDraft.trim() && !chatAttachment)}
            >
              Envoyer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

