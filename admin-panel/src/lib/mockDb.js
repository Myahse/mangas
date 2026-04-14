import { randomId, readJson, writeJson } from './storage.js';

const DB_KEY = 'db_v1';
const USERS_KEY = 'mangaafrik_users_v1';
const CREATOR_REQUESTS_KEY = 'mangaafrik_creator_requests_v1';
const SUBMISSIONS_KEY = 'mangaafrik_manga_submissions_v1';

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeList(key, list, limit = 500) {
  localStorage.setItem(key, JSON.stringify(list.slice(0, limit)));
}

function getUsersExternal() {
  return safeParse(localStorage.getItem(USERS_KEY), []);
}

function getCreatorRequestsExternal() {
  return safeParse(localStorage.getItem(CREATOR_REQUESTS_KEY), []);
}

function getSubmissionsExternal() {
  return safeParse(localStorage.getItem(SUBMISSIONS_KEY), []);
}

function seed() {
  const now = new Date().toISOString();
  return {
    metas: { seededAt: now },
    users: [
      {
        id: 'u_admin',
        email: 'admin@mangaafrik.local',
        name: 'Admin',
        role: 'admin',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'u_01',
        email: 'reader1@example.com',
        name: 'Reader One',
        role: 'reader',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'u_02',
        email: 'creator1@example.com',
        name: 'Creator One',
        role: 'creator',
        status: 'active',
        createdAt: now,
      },
    ],
    mangas: [
      {
        id: 'm_01',
        title: 'Akwa Origins',
        slug: 'akwa-origins',
        status: 'published',
        createdAt: now,
      },
      {
        id: 'm_02',
        title: 'Lagoon Runner',
        slug: 'lagoon-runner',
        status: 'draft',
        createdAt: now,
      },
    ],
    mangaRequests: [
      {
        id: 'r_01',
        requestedTitle: 'Nouchi Legends',
        requestedBy: 'reader1@example.com',
        notes: 'Could you add this manga? I heard it is great.',
        status: 'new',
        createdAt: now,
      },
    ],
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
    const extUsers = getUsersExternal();
    const extCreatorRequests = getCreatorRequestsExternal();
    const extSubmissions = getSubmissionsExternal();
    return {
      usersTotal: db.users.length + extUsers.length,
      requestsTotal: db.mangaRequests.length,
      requestsNew: db.mangaRequests.filter((r) => r.status === 'new').length,
      mangasTotal: db.mangas.length,
      mangasPublished: db.mangas.filter((m) => m.status === 'published').length,
      auditsTotal: db.audits.length,
      creatorRequestsPending: extCreatorRequests.filter((r) => r.status === 'pending')
        .length,
      submissionsPending: extSubmissions.filter((s) => s.status === 'pending').length,
    };
  },

  listUsers() {
    const seeded = getDb().users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.name,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      source: 'seed',
    }));
    const ext = getUsersExternal().map((u) => ({ ...u, source: 'front' }));
    return [...ext, ...seeded].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  updateUser(id, patch) {
    // Only external users are editable in this demo.
    const users = getUsersExternal();
    const extIdx = users.findIndex((u) => u.id === id);
    if (extIdx !== -1) {
      users[extIdx] = { ...users[extIdx], ...patch };
      writeList(USERS_KEY, users);
      audit('user.update', { id, patch });
      return users[extIdx];
    }

    const db = getDb();
    const seedIdx = db.users.findIndex((u) => u.id === id);
    if (seedIdx === -1) throw new Error('User not found');
    db.users[seedIdx] = { ...db.users[seedIdx], ...patch };
    setDb(db);
    audit('user.update', { id, patch });
    return db.users[seedIdx];
  },

  listCreatorRequests() {
    return getCreatorRequestsExternal().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  reviewCreatorRequest(id, decision, reason) {
    const reqs = getCreatorRequestsExternal();
    const idx = reqs.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Creator request not found');
    const next = {
      ...reqs[idx],
      status: decision,
      reason: reason || '',
      reviewedAt: new Date().toISOString(),
    };
    reqs[idx] = next;
    writeList(CREATOR_REQUESTS_KEY, reqs);
    audit('creator_request.review', { id, decision });
    return next;
  },

  listMangaSubmissions() {
    return getSubmissionsExternal().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  reviewMangaSubmission(id, decision, reason) {
    const subs = getSubmissionsExternal();
    const idx = subs.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Submission not found');
    const next = {
      ...subs[idx],
      status: decision, // approved | rejected | resubmit
      moderation: {
        decision,
        reason: reason || '',
        reviewedAt: new Date().toISOString(),
      },
    };
    subs[idx] = next;
    writeList(SUBMISSIONS_KEY, subs);

    if (decision === 'approved') {
      const db = getDb();
      const title = next.payload?.title || 'Untitled';
      const slug =
        (next.payload?.title || 'untitled')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

      db.mangas.unshift({
        id: randomId('m_'),
        title,
        slug,
        status: 'published',
        createdAt: new Date().toISOString(),
      });
      setDb(db);
      audit('submission.approve', { id, title });
    } else {
      audit(`submission.${decision}`, { id });
    }

    return next;
  },

  listMangaRequests() {
    const db = getDb();
    return db.mangaRequests
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createMangaRequest(data) {
    const db = getDb();
    const row = {
      id: randomId('r_'),
      requestedTitle: data.requestedTitle?.trim() || 'Untitled',
      requestedBy: data.requestedBy?.trim() || 'unknown',
      notes: data.notes?.trim() || '',
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    db.mangaRequests.unshift(row);
    setDb(db);
    audit('request.create', { id: row.id });
    return row;
  },

  updateMangaRequest(id, patch) {
    const db = getDb();
    const idx = db.mangaRequests.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Request not found');
    db.mangaRequests[idx] = { ...db.mangaRequests[idx], ...patch };
    setDb(db);
    audit('request.update', { id, patch });
    return db.mangaRequests[idx];
  },

  deleteMangaRequest(id) {
    const db = getDb();
    const before = db.mangaRequests.length;
    db.mangaRequests = db.mangaRequests.filter((r) => r.id !== id);
    setDb(db);
    audit('request.delete', { id });
    return db.mangaRequests.length !== before;
  },

  listMangas() {
    return getDb().mangas.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createManga(data) {
    const db = getDb();
    const title = data.title?.trim() || 'Untitled';
    const slug =
      data.slug?.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const row = {
      id: randomId('m_'),
      title,
      slug,
      status: data.status || 'draft',
      createdAt: new Date().toISOString(),
    };
    db.mangas.unshift(row);
    setDb(db);
    audit('manga.create', { id: row.id });
    return row;
  },

  updateManga(id, patch) {
    const db = getDb();
    const idx = db.mangas.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Manga not found');
    db.mangas[idx] = { ...db.mangas[idx], ...patch };
    setDb(db);
    audit('manga.update', { id, patch });
    return db.mangas[idx];
  },

  deleteManga(id) {
    const db = getDb();
    const before = db.mangas.length;
    db.mangas = db.mangas.filter((m) => m.id !== id);
    setDb(db);
    audit('manga.delete', { id });
    return db.mangas.length !== before;
  },

  listAudits() {
    return getDb().audits.slice();
  },
};

