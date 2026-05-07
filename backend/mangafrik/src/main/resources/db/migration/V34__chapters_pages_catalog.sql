-- Catalog queries reference chapters/pages; partial migrations may have manga only.
create extension if not exists pgcrypto;

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  manga_id uuid not null references manga(id) on delete cascade,
  number int not null,
  title text,
  published_date text,
  pages_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manga_id, number)
);

create index if not exists idx_chapters_manga_id on chapters (manga_id);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  number int not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (chapter_id, number)
);

create index if not exists idx_pages_chapter_id on pages (chapter_id);
