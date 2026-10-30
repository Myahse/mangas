-- Community translations: readers translate a chapter's speech bubbles into African languages.
-- A bubble is a box on one page (percentages of the image, so it fits any screen size).
-- Each bubble has at most one translation per language and translator; the series' creator (or staff)
-- approves them, and an approved translation pays its translator once.
-- User ids are text because app_users.id is bigint on older databases and uuid on newer ones.

create table if not exists page_bubbles (
  id uuid primary key,
  manga_slug text not null,
  chapter_number int not null,
  page_number int not null,
  x numeric(6,3) not null,
  y numeric(6,3) not null,
  w numeric(6,3) not null,
  h numeric(6,3) not null,
  original_text text,
  created_by text not null,
  created_at timestamptz not null default now(),
  check (x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= 100.001 and y + h <= 100.001)
);

create index if not exists page_bubbles_chapter_idx
  on page_bubbles (manga_slug, chapter_number, page_number);

create table if not exists bubble_translations (
  id uuid primary key,
  bubble_id uuid not null references page_bubbles(id) on delete cascade,
  lang text not null,
  text text not null,
  translator_id text not null,
  status text not null default 'pending',  -- pending | approved | rejected
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bubble_id, lang, translator_id)
);

create index if not exists bubble_translations_status_idx on bubble_translations (status, created_at);
-- Only one approved text per bubble and language: approving a new one replaces the old.
create unique index if not exists bubble_translations_one_approved_uidx
  on bubble_translations (bubble_id, lang) where status = 'approved';
