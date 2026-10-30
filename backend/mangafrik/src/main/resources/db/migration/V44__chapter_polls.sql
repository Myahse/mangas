-- "Les lecteurs votent la suite": a creator asks readers what happens next at the end of a chapter.
-- Each reader has one free vote per poll and can add votes with coins (each boost row costs coins).
-- User ids are text because app_users.id is bigint on older databases and uuid on newer ones.

create table if not exists chapter_polls (
  id uuid primary key,
  manga_slug text not null,
  chapter_number int not null,
  question text not null,
  status text not null default 'open',  -- open | closed
  closes_at timestamptz,
  winner_option_id uuid,
  created_by text not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- One poll per chapter.
create unique index if not exists chapter_polls_chapter_uidx on chapter_polls (manga_slug, chapter_number);

create table if not exists poll_options (
  id uuid primary key,
  poll_id uuid not null references chapter_polls(id) on delete cascade,
  label text not null,
  position int not null
);

create table if not exists poll_votes (
  id uuid primary key,
  poll_id uuid not null references chapter_polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  user_id text not null,
  votes int not null,
  coins_spent int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists poll_votes_poll_idx on poll_votes (poll_id, option_id);
-- The free vote: at most one per reader and poll.
create unique index if not exists poll_votes_free_uidx on poll_votes (poll_id, user_id) where coins_spent = 0;
