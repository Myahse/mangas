-- Cultural notes: a short card attached to a spot of a page (a dish, a mask, a proverb...).
-- Readers propose them; the series' creator or staff approve them (their own are published directly),
-- and an approved note pays its author once. Box coordinates are percentages of the page image.

create table if not exists cultural_notes (
  id uuid primary key,
  manga_slug text not null,
  chapter_number int not null,
  page_number int not null,
  x numeric(6,3) not null,
  y numeric(6,3) not null,
  w numeric(6,3) not null,
  h numeric(6,3) not null,
  title text not null,
  body text not null,
  author_id text not null,
  status text not null default 'pending',  -- pending | approved | rejected
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= 100.001 and y + h <= 100.001)
);

create index if not exists cultural_notes_chapter_idx
  on cultural_notes (manga_slug, chapter_number, page_number);
create index if not exists cultural_notes_status_idx on cultural_notes (status, created_at);
