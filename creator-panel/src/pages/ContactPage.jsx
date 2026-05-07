import { useMemo, useState } from 'react';
import { creatorApi } from '../services/api.js';
import './ContactPage.css';

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

  const faqs = useMemo(
    () => [
      {
        q: 'Je n’arrive pas à publier / soumettre une série',
        a: (
          <div>
            <p>Vérifie ta connexion et essaye de relancer l’app.</p>
            <p>Si ça bloque, envoie un ticket avec le nom de la série et ce que tu faisais.</p>
          </div>
        ),
      },
      {
        q: 'Upload image / thumbnail échoue',
        a: (
          <div>
            <p>Essaye une image JPG/PNG plus légère (moins de 2–3 Mo si possible).</p>
            <p>Si ça persiste, envoie le message d’erreur dans un ticket.</p>
          </div>
        ),
      },
      {
        q: 'Chat en direct : comment ça marche ?',
        a: (
          <div>
            <p>
              Le chat démarre en créant un ticket “chat”. Un agent te répond dès qu’il est dispo.
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
      const created = await creatorApi.createSupportTicket(payload);
      setSuccess(created);
      setForm((f) => ({ ...f, subject: '', description: '' }));
    } catch (e) {
      setError(e?.message || "Impossible d'envoyer le ticket.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <h1>Nous contacter</h1>
        <p className="contact-muted">
          Besoin d’aide sur le panneau créateur ? On est là.
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
                placeholder="Ex: upload échoue"
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
              placeholder="Explique-nous le problème, et si possible : étape + capture + message d’erreur."
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
        </div>
      ) : null}
    </div>
  );
}

