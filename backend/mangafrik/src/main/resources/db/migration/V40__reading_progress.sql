-- Where each reader stopped in each series (one row per user and series), for "Reprendre la lecture".
-- user_id is text because app_users.id is bigint on older databases and uuid on newer ones.

create table if not exists reading_progress (
  user_id text not null,
  manga_slug text not null,
  chapter_number int not null,
  page_index int not null default 0,
  page_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, manga_slug)
);

create index if not exists reading_progress_user_updated_at_idx
  on reading_progress (user_id, updated_at desc);
