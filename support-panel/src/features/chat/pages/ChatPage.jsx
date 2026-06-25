import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Paperclip, Send } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import { SupportSectionPage } from '../../../pages/SupportSectionPage.jsx';
import { storageObjectUrl, supportApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

function normalizeTicketRef(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('(') && s.endsWith(')'))) {
    s = s.slice(1, -1).trim();
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  return s;
}

function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/'));
}

function isImageAttachment({ contentType, name, key }) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return true;
  const n = String(name || '').toLowerCase();
  const k = String(key || '').toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(k);
}

function withCacheBust(url) {
  const u = String(url || '');
  if (!u) return '';
  const sep = u.includes('?') ? '&' : '?';
  return `${u}${sep}t=${Date.now()}`;
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

function ticketFingerprint(t) {
  try {
    if (!t) return '';
    return JSON.stringify({
      id: t.id,
      type: t.type,
      status: t.status,
      subject: t.subject,
      description: t.description,
      user: t.user,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      validationNote: t.validationNote,
      rejectionReason: t.rejectionReason,
    });
  } catch {
    return '';
  }
}

function formatFrom(from) {
  return from === 'support' ? 'Support' : 'User';
}

function TypingIndicator() {
  return (
    <div className="support-typing" aria-live="polite" aria-label="User is typing">
      <span className="support-typing__dots" aria-hidden="true">
        <span className="support-typing__dot" />
        <span className="support-typing__dot" />
        <span className="support-typing__dot" />
      </span>
      <span className="support-typing__label">Typing…</span>
    </div>
  );
}

export function ChatPage() {
  const [params] = useSearchParams();
  const qpTicket = params.get('ticket');
  const ticketId = useMemo(() => normalizeTicketRef(qpTicket || ''), [qpTicket]);
  const [text, setText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const attachmentPreviewUrl = useMemo(() => {
    if (!attachmentFile || !isImageFile(attachmentFile)) return null;
    return URL.createObjectURL(attachmentFile);
  }, [attachmentFile]);
  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const agentIsTyping = Boolean(text.trim()) || Boolean(attachmentFile);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [preview, setPreview] = useState(null); // { url, name, contentType }
  const [brokenImages, setBrokenImages] = useState(() => new Set()); // attachmentKey strings
  const [error, setError] = useState('');
  const stompRef = useRef(null);
  const remoteTypingTimerRef = useRef(null);
  const sendTypingTimerRef = useRef(null);
  const [stompConnected, setStompConnected] = useState(false);
  const chatScrollRef = useRef(null);
  const chatStickBottomRef = useRef(true);
  const TYPING_IDLE_MS = 2200;
  const REMOTE_TYPING_HIDE_MS = 3500;
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

  const onChatScroll = useCallback(() => {
    if (agentIsTyping || remoteTyping) {
      chatStickBottomRef.current = true;
      return;
    }
    const el = chatScrollRef.current;
    if (!el) return;
    const threshold = 80;
    chatStickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, [agentIsTyping, remoteTyping]);

  useEffect(() => {
    chatStickBottomRef.current = true;
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || !ticket) return;
    const forceFollow = agentIsTyping || remoteTyping;
    if (forceFollow) chatStickBottomRef.current = true;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollChatToBottom({ force: forceFollow }));
    });
    return () => cancelAnimationFrame(id);
  }, [ticketId, ticket, messages, remoteTyping, agentIsTyping, scrollChatToBottom]);

  useEffect(() => {
    if (!ticketId) {
      setRemoteTyping(false);
      setStompConnected(false);
      try {
        stompRef.current?.deactivate();
      } catch {}
      stompRef.current = null;
      return () => {};
    }
    let cancelled = false;

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

      const stomp = new Client({
        brokerURL,
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 600,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          if (cancelled) return;
          setStompConnected(true);
          const topic = `/topic/support/tickets/${ticketId}/typing`;
          stomp.subscribe(topic, (msg) => {
            if (cancelled) return;
            try {
              const evt = JSON.parse(msg.body || '{}');
              if (evt?.ticketId !== ticketId) return;
              if (evt?.from !== 'user') return;
              const typing = Boolean(evt?.typing);
              setRemoteTyping(typing);
              if (remoteTypingTimerRef.current) window.clearTimeout(remoteTypingTimerRef.current);
              if (typing) {
                remoteTypingTimerRef.current = window.setTimeout(
                  () => setRemoteTyping(false),
                  REMOTE_TYPING_HIDE_MS,
                );
              }
            } catch {}
          });
          stomp.subscribe(`/topic/support/tickets/${ticketId}/messages`, (msg) => {
            if (cancelled) return;
            try {
              const m = JSON.parse(msg.body || '{}');
              if (!m?.id) return;
              setMessages((prev) => {
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
      if (remoteTypingTimerRef.current) window.clearTimeout(remoteTypingTimerRef.current);
      remoteTypingTimerRef.current = null;
      try {
        stompRef.current?.deactivate();
      } catch {}
      stompRef.current = null;
      setStompConnected(false);
    };
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    if (!stompConnected) return;

    const publishTyping = (typing) => {
      try {
        stompRef.current?.publish({
          destination: '/app/support/typing',
          body: JSON.stringify({ ticketId, from: 'support', typing, at: new Date().toISOString() }),
        });
      } catch {}
    };

    if (sendTypingTimerRef.current) window.clearTimeout(sendTypingTimerRef.current);
    if (agentIsTyping) {
      publishTyping(true);
      sendTypingTimerRef.current = window.setTimeout(() => publishTyping(false), TYPING_IDLE_MS);
    } else {
      publishTyping(false);
    }
  }, [ticketId, agentIsTyping, stompConnected, text]);

  async function loadChat({ silent } = { silent: false }) {
    if (!ticketId) return;
    if (!silent) setError('');
    try {
      const [t, m] = await Promise.all([supportApi.getTicket(ticketId), supportApi.listMessages(ticketId)]);
      const nextTicket = t || null;
      const nextMessages = Array.isArray(m) ? m : [];
      setTicket((prev) => (ticketFingerprint(prev) === ticketFingerprint(nextTicket) ? prev : nextTicket));
      setMessages((prev) => (messagesFingerprint(prev) === messagesFingerprint(nextMessages) ? prev : nextMessages));
    } catch (e) {
      if (!silent) setError(e?.message || 'Failed to load chat');
    }
  }

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      setMessages([]);
      return () => {};
    }

    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadChat({ silent: false });
    })();

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      await loadChat({ silent: true });
    };

    const timer = window.setInterval(tick, CHAT_POLL_FALLBACK_MS);
    document.addEventListener('visibilitychange', tick);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const description = useMemo(() => {
    if (ticket) return `Talking to ${ticket.user?.name || 'Unknown'} about “${ticket.subject}”.`;
    return 'Pick a ticket from the Inbox to start chatting.';
  }, [ticket]);

  return (
    <SupportSectionPage
      title="Chat"
      description={description}
      right={
        ticket ? (
          <div className="support-badge">
            <span style={{ opacity: 0.8 }}>Ticket</span>
            <span>{ticket.id}</span>
          </div>
        ) : null
      }
    >
      <div className="support-surface">
        <div className="support-surface__inner">
          {error ? <div className="support-muted" style={{ marginBottom: 12 }}>{error}</div> : null}
          {!ticket ? (
            <div className="support-muted">
              No ticket selected. Go to Inbox and click “Chat” on a ticket.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                className="support-surface"
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <div
                  ref={chatScrollRef}
                  onScroll={onChatScroll}
                  style={{
                    padding: 14,
                    maxHeight: 420,
                    overflow: 'auto',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  {messages.length === 0 ? (
                    <div className="support-muted">No messages yet.</div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'grid',
                          justifyItems: m.from === 'support' ? 'end' : 'start',
                          gap: 4,
                        }}
                      >
                        <div className="support-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                          {formatFrom(m.from)} • {new Date(m.at).toLocaleString()}
                        </div>
                        <div
                          style={{
                            maxWidth: 760,
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid var(--surface-border)',
                            background:
                              m.from === 'support'
                                ? 'color-mix(in srgb, var(--primary) 22%, var(--surface-bg) 78%)'
                                : 'color-mix(in srgb, var(--surface-bg) 92%, #000 8%)',
                            fontWeight: 700,
                          }}
                        >
                          {m.text ? <div>{m.text}</div> : null}
                          {m.attachmentKey ? (
                            <div style={{ marginTop: m.text ? 8 : 0 }}>
                              {isImageAttachment({
                                contentType: m.attachmentContentType,
                                name: m.attachmentName,
                                key: m.attachmentKey,
                              }) && !brokenImages.has(m.attachmentKey) ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreview({
                                      url: storageObjectUrl(m.attachmentKey),
                                      name: m.attachmentName || 'Image',
                                      contentType: m.attachmentContentType || 'image/*',
                                    })
                                  }
                                  style={{
                                    padding: 0,
                                    border: 0,
                                    background: 'transparent',
                                    cursor: 'zoom-in',
                                    display: 'inline-block',
                                  }}
                                  aria-label="Preview image"
                                >
                                  <img
                                    src={storageObjectUrl(m.attachmentKey)}
                                    alt={m.attachmentName || 'Attachment'}
                                    onError={() => {
                                      setBrokenImages((prev) => {
                                        const next = new Set(prev);
                                        next.add(m.attachmentKey);
                                        return next;
                                      });
                                    }}
                                    style={{
                                      borderRadius: 10,
                                      border: '1px solid var(--surface-border)',
                                      background: 'color-mix(in srgb, var(--surface-bg) 90%, #000 10%)',
                                      display: 'block',
                                      maxWidth: 'min(320px, 100%)',
                                      maxHeight: 170,
                                      width: 'auto',
                                      height: 'auto',
                                    }}
                                  />
                                </button>
                              ) : (
                                <div style={{ display: 'grid', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreview({
                                        url: storageObjectUrl(m.attachmentKey),
                                        name: m.attachmentName || 'Attachment',
                                        contentType: m.attachmentContentType || '',
                                      })
                                    }
                                    style={{
                                      fontWeight: 900,
                                      color: 'var(--primary)',
                                      background: 'transparent',
                                      border: 0,
                                      padding: 0,
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                  >
                                    {m.attachmentName || 'Attachment'}
                                  </button>
                                  {isImageAttachment({
                                    contentType: m.attachmentContentType,
                                    name: m.attachmentName,
                                    key: m.attachmentKey,
                                  }) ? (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                      <div className="support-muted" style={{ fontSize: 12 }}>
                                        Preview unavailable. Use “Download”.
                                      </div>
                                      <button
                                        type="button"
                                        className="support-btn support-btn--ghost"
                                        onClick={() => {
                                          try {
                                            navigator.clipboard?.writeText(String(m.attachmentKey || ''));
                                          } catch {}
                                        }}
                                        style={{ padding: '6px 10px', fontSize: 12 }}
                                        title={m.attachmentKey || ''}
                                      >
                                        Copy key
                                      </button>
                                      <button
                                        type="button"
                                        className="support-btn support-btn--ghost"
                                        onClick={() => {
                                          setBrokenImages((prev) => {
                                            const next = new Set(prev);
                                            next.delete(m.attachmentKey);
                                            return next;
                                          });
                                          setPreview({
                                            url: withCacheBust(storageObjectUrl(m.attachmentKey)),
                                            name: m.attachmentName || 'Image',
                                            contentType: m.attachmentContentType || 'image/*',
                                          });
                                        }}
                                        style={{ padding: '6px 10px', fontSize: 12 }}
                                      >
                                        Force preview
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}

                  {remoteTyping ? (
                    <div
                      style={{
                        display: 'grid',
                        justifyItems: 'start',
                      }}
                    >
                      <TypingIndicator />
                    </div>
                  ) : null}
                </div>
              </div>

              {preview ? (
                <div
                  role="dialog"
                  aria-modal="true"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setPreview(null);
                  }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.72)',
                    display: 'grid',
                    placeItems: 'center',
                    padding: 16,
                    zIndex: 9999,
                  }}
                >
                  <div
                    className="support-surface"
                    style={{
                      width: 'min(980px, 100%)',
                      maxHeight: 'min(90vh, 900px)',
                      overflow: 'hidden',
                      borderRadius: 14,
                    }}
                  >
                    <div
                      className="support-surface__inner"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                    >
                      <div style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {preview.name}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <a
                          href={preview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="support-btn support-btn--ghost"
                          style={{ textDecoration: 'none' }}
                        >
                          Download
                        </a>
                        <button type="button" className="support-btn" onClick={() => setPreview(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: 14, background: 'rgba(0,0,0,0.04)', overflow: 'auto', maxHeight: 'calc(90vh - 90px)' }}>
                      {String(preview.contentType || '').startsWith('image/') ? (
                        <img
                          src={preview.url}
                          alt={preview.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: 'calc(90vh - 140px)',
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            margin: '0 auto',
                            borderRadius: 12,
                            objectFit: 'contain',
                            background: 'rgba(0,0,0,0.04)',
                          }}
                        />
                      ) : (
                        <div className="support-muted">Preview not available. Use Download.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <form
                className="support-chat-compose-row"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!text.trim() && !attachmentFile) return;
                  chatStickBottomRef.current = true;
                  try {
                    let attachment;
                    if (attachmentFile) {
                      const up = await supportApi.uploadAttachment(ticketId, attachmentFile);
                      attachment = {
                        key: up.key,
                        name: up.fileName,
                        contentType: up.contentType,
                      };
                    }
                    await supportApi.sendMessage(ticketId, 'support', text || '', attachment);
                    setText('');
                    setAttachmentFile(null);
                    await loadChat({ silent: true });
                  } catch (err) {
                    notify.error(err?.message || 'Send failed');
                  }
                }}
              >
                <div className="support-chat-composer">
                  <label className="support-chat-composer__attach" title="Attach file">
                    <input
                      type="file"
                      className="support-chat-composer__file-input"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setAttachmentFile(f || null);
                        e.target.value = '';
                      }}
                    />
                    <span className="support-chat-composer__attach-icon">
                      <Paperclip size={20} strokeWidth={2} />
                    </span>
                  </label>
                  {attachmentFile ? (
                    <div className="support-chat-composer__preview">
                      {attachmentPreviewUrl ? (
                        <img src={attachmentPreviewUrl} alt="" className="support-chat-composer__thumb" />
                      ) : (
                        <span className="support-chat-composer__doc-thumb">
                          <FileText size={22} strokeWidth={2} />
                        </span>
                      )}
                      <span className="support-chat-composer__preview-meta">
                        <span className="support-chat-composer__preview-name">{attachmentFile.name}</span>
                        <span className="support-chat-composer__preview-hint">
                          {isImageFile(attachmentFile) ? 'Image' : 'Document'}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="support-chat-composer__preview-remove"
                        onClick={() => setAttachmentFile(null)}
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <input
                    className="support-chat-composer__field"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={attachmentFile ? 'Caption (optional)…' : 'Write a message to the user…'}
                  />
                </div>
                <button
                  className="support-btn support-btn--primary support-chat-compose-row__send"
                  type="submit"
                  disabled={!text.trim() && !attachmentFile}
                >
                  <Send size={16} />
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </SupportSectionPage>
  );
}

