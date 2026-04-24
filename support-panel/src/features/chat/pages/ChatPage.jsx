import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { SupportSectionPage } from '../../../pages/SupportSectionPage.jsx';
import { supportApi } from '../../../services/api.js';
import { notify } from '../../../services/notify.js';

function formatFrom(from) {
  return from === 'support' ? 'Support' : 'User';
}

export function ChatPage() {
  const [params] = useSearchParams();
  const ticketId = params.get('ticket') || '';
  const [refreshKey, setRefreshKey] = useState(0);
  const [text, setText] = useState('');
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    if (!ticketId) {
      setTicket(null);
      setMessages([]);
      return () => {};
    }

    Promise.all([supportApi.getTicket(ticketId), supportApi.listMessages(ticketId)])
      .then(([t, m]) => {
        if (cancelled) return;
        setTicket(t || null);
        setMessages(Array.isArray(m) ? m : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load chat');
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId, refreshKey]);

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
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  supportApi
                    .sendMessage(ticketId, 'support', text)
                    .then(() => {
                      setText('');
                      setRefreshKey((k) => k + 1);
                    })
                    .catch((err) => notify.error(err?.message || 'Send failed'));
                }}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}
              >
                <input
                  className="support-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message to the user..."
                />
                <button className="support-btn support-btn--primary" type="submit" disabled={!text.trim()}>
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

