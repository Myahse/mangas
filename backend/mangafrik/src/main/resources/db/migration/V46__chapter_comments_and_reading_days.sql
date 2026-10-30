-- Reader comments at the end of a chapter (with likes), and the days a reader read something,
-- for reading streaks. User ids are text because app_users.id is bigint on older databases and uuid
-- on newer ones.

create table if not exists chapter_comments (
  id uuid primary key,
  manga_slug text not null,
  chapter_number int not null,
  user_id text not null,
  text text not null,
  status text not null default 'visible',  -- visible | hidden (moderated)
  created_at timestamptz not null default now()
);

create index if not exists chapter_comments_chapter_idx
  on chapter_comments (manga_slug, chapter_number, created_at desc);
create index if not exists chapter_comments_user_idx on chapter_comments (user_id, created_at desc);

create table if not exists chapter_comment_likes (
  comment_id uuid not null references chapter_comments(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists reading_days (
  user_id text not null,
  day date not null,
  primary key (user_id, day)
);
