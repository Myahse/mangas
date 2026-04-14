type UserRole = 'reader' | 'creator';

export type RegisteredUserRow = {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
  status: 'active' | 'disabled';
  createdAt: string;
};

export type CreatorRequestRow = {
  id: string;
  email: string;
  displayName: string;
  penName?: string;
  genres?: string;
  publishingGoal?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  reviewedAt?: string;
};

const USERS_KEY = 'mangaafrik_users_v1';
const CREATOR_REQUESTS_KEY = 'mangaafrik_creator_requests_v1';

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function randomId(prefix: string) {
  return `${prefix}${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

export function recordUserRegistration(input: {
  role: UserRole;
  displayName: string;
  email: string;
  creatorProfile?: { penName?: string; genres?: string; publishingGoal?: string };
}) {
  const createdAt = new Date().toISOString();

  const users = safeParse<RegisteredUserRow[]>(localStorage.getItem(USERS_KEY), []);
  const userRow: RegisteredUserRow = {
    id: randomId('u_'),
    role: input.role,
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    status: 'active',
    createdAt,
  };

  users.unshift(userRow);
  localStorage.setItem(USERS_KEY, JSON.stringify(users.slice(0, 500)));

  if (input.role === 'creator') {
    const reqs = safeParse<CreatorRequestRow[]>(
      localStorage.getItem(CREATOR_REQUESTS_KEY),
      [],
    );

    reqs.unshift({
      id: randomId('cr_'),
      email: userRow.email,
      displayName: userRow.displayName,
      penName: input.creatorProfile?.penName,
      genres: input.creatorProfile?.genres,
      publishingGoal: input.creatorProfile?.publishingGoal,
      status: 'pending',
      createdAt,
    });

    localStorage.setItem(CREATOR_REQUESTS_KEY, JSON.stringify(reqs.slice(0, 500)));
  }
}

