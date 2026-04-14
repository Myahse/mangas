import { randomId, readJson, writeJson } from './storage.js';

const DB_KEY = 'db_v1';

function seed() {
  const now = new Date().toISOString();
  return {
    metas: { seededAt: now },
    heroAds: [
      {
        id: 'ad_01',
        title: 'Welcome promo',
        subtitle: 'New chapters every week',
        imageUrl: '',
        ctaLabel: 'Explore',
        ctaUrl: '/explore',
        status: 'active', // active | paused | scheduled | ended
        startsAt: now,
        endsAt: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
    notifications: [
      {
        id: 'n_01',
        channel: 'push', // push | in_app
        title: 'New release',
        body: 'A new manga chapter is out now.',
        target: 'all', // all | segment | user
        segment: '',
        userId: '',
        deepLink: '/home',
        status: 'draft', // draft | queued | sent | cancelled
        scheduledAt: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
    systemNotices: [
      {
        id: 'sn_01',
        severity: 'info', // info | warning | critical
        title: 'Maintenance window',
        message: 'Scheduled maintenance tonight at 02:00 UTC.',
        status: 'scheduled', // active | scheduled | ended | disabled
        startsAt: now,
        endsAt: '',
        createdAt: now,
        updatedAt: now,
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

function sortByUpdatedDesc(list) {
  return list.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export const mockDb = {
  getSummary() {
    const db = getDb();
    const heroAdsActive = db.heroAds.filter((a) => a.status === 'active').length;
    const noticesActive = db.systemNotices.filter((n) => n.status === 'active').length;
    const pushQueued = db.notifications.filter((n) => n.channel === 'push' && n.status === 'queued').length;
    return {
      heroAdsTotal: db.heroAds.length,
      heroAdsActive,
      notificationsTotal: db.notifications.length,
      pushQueued,
      systemNoticesTotal: db.systemNotices.length,
      noticesActive,
      auditsTotal: db.audits.length,
    };
  },

  listHeroAds() {
    return sortByUpdatedDesc(getDb().heroAds);
  },

  createHeroAd(data) {
    const db = getDb();
    const now = new Date().toISOString();
    const row = {
      id: randomId('ad_'),
      title: (data.title || '').trim() || 'Untitled ad',
      subtitle: (data.subtitle || '').trim() || '',
      imageUrl: (data.imageUrl || '').trim() || '',
      ctaLabel: (data.ctaLabel || '').trim() || 'Learn more',
      ctaUrl: (data.ctaUrl || '').trim() || '/',
      status: data.status || 'paused',
      startsAt: (data.startsAt || '').trim() || '',
      endsAt: (data.endsAt || '').trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    db.heroAds.unshift(row);
    setDb(db);
    audit('hero_ad.create', { id: row.id });
    return row;
  },

  updateHeroAd(id, patch) {
    const db = getDb();
    const idx = db.heroAds.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Hero ad not found');
    db.heroAds[idx] = {
      ...db.heroAds[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setDb(db);
    audit('hero_ad.update', { id, patch });
    return db.heroAds[idx];
  },

  deleteHeroAd(id) {
    const db = getDb();
    const before = db.heroAds.length;
    db.heroAds = db.heroAds.filter((a) => a.id !== id);
    setDb(db);
    audit('hero_ad.delete', { id });
    return db.heroAds.length !== before;
  },

  listNotifications() {
    return sortByUpdatedDesc(getDb().notifications);
  },

  createNotification(data) {
    const db = getDb();
    const now = new Date().toISOString();
    const row = {
      id: randomId('n_'),
      channel: data.channel === 'in_app' ? 'in_app' : 'push',
      title: (data.title || '').trim() || 'Untitled notification',
      body: (data.body || '').trim() || '',
      target: data.target || 'all',
      segment: (data.segment || '').trim() || '',
      userId: (data.userId || '').trim() || '',
      deepLink: (data.deepLink || '').trim() || '',
      status: data.status || 'draft',
      scheduledAt: (data.scheduledAt || '').trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    db.notifications.unshift(row);
    setDb(db);
    audit('notification.create', { id: row.id });
    return row;
  },

  updateNotification(id, patch) {
    const db = getDb();
    const idx = db.notifications.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Notification not found');
    db.notifications[idx] = {
      ...db.notifications[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setDb(db);
    audit('notification.update', { id, patch });
    return db.notifications[idx];
  },

  deleteNotification(id) {
    const db = getDb();
    const before = db.notifications.length;
    db.notifications = db.notifications.filter((n) => n.id !== id);
    setDb(db);
    audit('notification.delete', { id });
    return db.notifications.length !== before;
  },

  listSystemNotices() {
    return sortByUpdatedDesc(getDb().systemNotices);
  },

  createSystemNotice(data) {
    const db = getDb();
    const now = new Date().toISOString();
    const row = {
      id: randomId('sn_'),
      severity: data.severity || 'info',
      title: (data.title || '').trim() || 'Untitled notice',
      message: (data.message || '').trim() || '',
      status: data.status || 'scheduled',
      startsAt: (data.startsAt || '').trim() || '',
      endsAt: (data.endsAt || '').trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    db.systemNotices.unshift(row);
    setDb(db);
    audit('system_notice.create', { id: row.id });
    return row;
  },

  updateSystemNotice(id, patch) {
    const db = getDb();
    const idx = db.systemNotices.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('System notice not found');
    db.systemNotices[idx] = {
      ...db.systemNotices[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setDb(db);
    audit('system_notice.update', { id, patch });
    return db.systemNotices[idx];
  },

  deleteSystemNotice(id) {
    const db = getDb();
    const before = db.systemNotices.length;
    db.systemNotices = db.systemNotices.filter((n) => n.id !== id);
    setDb(db);
    audit('system_notice.delete', { id });
    return db.systemNotices.length !== before;
  },

  listAudits() {
    return getDb().audits.slice();
  },
};

