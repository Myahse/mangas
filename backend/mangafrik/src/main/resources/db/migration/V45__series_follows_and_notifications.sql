-- Readers follow series; a new chapter of a followed series leaves a notification for each follower.
-- user_id is text because app_users.id is bigint on older databases and uuid on newer ones.

create table if not exists series_follows (
  user_id text not null,
  manga_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, manga_slug)
);

create index if not exists series_follows_slug_idx on series_follows (manga_slug);

create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null,            -- new_chapter
  title text not null,
  body text not null,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists user_notifications_user_idx on user_notifications (user_id, created_at desc);
