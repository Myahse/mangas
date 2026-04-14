import { randomId, readJson, writeJson } from './storage.js';

const DB_KEY = 'db_v1';

function seed() {
  const now = new Date().toISOString();
  const tickets = [
    {
      id: 't_01',
      type: 'issue',
      status: 'new',
      subject: 'Login error on mobile',
      description: 'I keep getting “Something went wrong” when I try to sign in.',
      user: { id: 'u_01', name: 'Reader One', email: 'reader1@example.com' },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 't_02',
      type: 'request',
      status: 'new',
      subject: 'Add payment method: MTN Mobile Money',
      description: 'Can you add MoMo as a payment option for subscriptions?',
      user: { id: 'u_02', name: 'Creator One', email: 'creator1@example.com' },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 't_03',
      type: 'issue',
      status: 'in_review',
      subject: 'Chapter images not loading',
      description: 'The reader shows blank pages for chapter 4.',
      user: { id: 'u_03', name: 'Reader Two', email: 'reader2@example.com' },
      createdAt: now,
      updatedAt: now,
    },
  ];

  const conversations = {
    t_01: [
      {
        id: randomId('m_'),
        at: now,
        from: 'user',
        text: 'Hi, I can’t log in from the mobile app.',
      },
    ],
    t_03: [
      {
        id: randomId('m_'),
        at: now,
        from: 'user',
        text: 'It loads the UI but pages are empty for chapter 4.',
      },
      {
        id: randomId('m_'),
        at: now,
        from: 'support',
        text: 'Thanks. Which device + OS version are you on?',
      },
    ],
  };

  return {
    metas: { seededAt: now },
    tickets,
    conversations,
    audits: [],
  };
}

function getDb() {
  const db = readJson(DB_KEY, null);
  if (db) return db;
  const seeded = seed();
  writeJson(DB_KEY, seeded);
  return seeded;
}

function setDb(nextDb) {
  writeJson(DB_KEY, nextDb);
}

function audit(action, payload) {
  const db = getDb();
  db.audits.unshift({
    id: randomId('a_'),
    at: new Date().toISOString(),
    action,
    payload,
  });
  db.audits = db.audits.slice(0, 250);
  setDb(db);
}

export const mockDb = {
  getSummary() {
    const db = getDb();
    return {
      ticketsTotal: db.tickets.length,
      ticketsNew: db.tickets.filter((t) => t.status === 'new').length,
      ticketsInReview: db.tickets.filter((t) => t.status === 'in_review').length,
      ticketsValidated: db.tickets.filter((t) => t.status === 'validated').length,
      ticketsRejected: db.tickets.filter((t) => t.status === 'rejected').length,
      auditsTotal: db.audits.length,
    };
  },

  listTickets() {
    const db = getDb();
    return db.tickets.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getTicket(id) {
    const db = getDb();
    return db.tickets.find((t) => t.id === id) || null;
  },

  updateTicket(id, patch) {
    const db = getDb();
    const idx = db.tickets.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Ticket not found');
    db.tickets[idx] = {
      ...db.tickets[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setDb(db);
    audit('ticket.update', { id, patch });
    return db.tickets[idx];
  },

  validateTicket(id, note) {
    const next = mockDb.updateTicket(id, { status: 'validated', validationNote: note || '' });
    audit('ticket.validate', { id });
    return next;
  },

  rejectTicket(id, reason) {
    const next = mockDb.updateTicket(id, { status: 'rejected', rejectionReason: reason || '' });
    audit('ticket.reject', { id });
    return next;
  },

  listMessages(ticketId) {
    const db = getDb();
    const msgs = db.conversations?.[ticketId] || [];
    return msgs.slice().sort((a, b) => a.at.localeCompare(b.at));
  },

  sendMessage(ticketId, from, text) {
    const db = getDb();
    const msg = {
      id: randomId('m_'),
      at: new Date().toISOString(),
      from: from === 'support' ? 'support' : 'user',
      text: (text || '').trim(),
    };
    if (!msg.text) throw new Error('Message text required');
    db.conversations = db.conversations || {};
    db.conversations[ticketId] = db.conversations[ticketId] || [];
    db.conversations[ticketId].push(msg);
    setDb(db);
    audit('chat.send', { ticketId, from: msg.from });
    return msg;
  },
};

