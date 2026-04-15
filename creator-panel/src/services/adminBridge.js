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
  return `${prefix}${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
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

  submissions.unshift({
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
  });

  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions.slice(0, 500)));
}

