const SUBMISSIONS_KEY = 'mangaafrik_manga_submissions_v1';
const SESSION_KEY = 'mangafrik_session';

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function randomId(prefix) {
  void prefix;
  return crypto.randomUUID();
}

export function recordMangaSubmission(input) {
  const createdAt = new Date().toISOString();
  const submissions = safeParse(localStorage.getItem(SUBMISSIONS_KEY), []);

  let session = null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    session = raw ? JSON.parse(raw) : null;
  } catch {
    session = null;
  }

  const row = {
    id: randomId('ms_'),
    status: 'pending', // pending | approved | rejected | resubmit
    createdAt,
    creator: {
      email: session?.email || 'unknown',
      displayName: session?.displayName || 'Unknown creator',
    },
    payload: input,
    moderation: {
      decision: null,
      reason: '',
      reviewedAt: null,
    },
  };

  submissions.unshift(row);

  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions.slice(0, 500)));
  return row;
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function listMyMangaSubmissions() {
  const session = loadSession();
  const email = (session?.email || '').toLowerCase().trim();
  const submissions = safeParse(localStorage.getItem(SUBMISSIONS_KEY), []);
  const mine = email ? submissions.filter((s) => (s?.creator?.email || '').toLowerCase().trim() === email) : submissions;
  return mine.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

