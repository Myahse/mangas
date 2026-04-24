-- Core domain schema for MangAfrik.
-- Flyway will run this once on the target database.

create table if not exists app_users (
  id bigserial primary key,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists manga (
  id bigserial primary key,
  title text not null,
  slug text not null unique,
  author text,
  artist text,
  cover text,
  banner text,
  hero_cover text,
  rating numeric(3,2) not null default 0,
  status text,
  views bigint not null default 0,
  synopsis text,
  featured boolean not null default false,
  year int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manga_featured on manga(featured);

create table if not exists genres (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists manga_genres (
  manga_id bigint not null references manga(id) on delete cascade,
  genre_id bigint not null references genres(id) on delete cascade,
  primary key (manga_id, genre_id)
);

create table if not exists chapters (
  id bigserial primary key,
  manga_id bigint not null references manga(id) on delete cascade,
  number int not null,
  title text,
  published_date text,
  pages_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manga_id, number)
);

create index if not exists idx_chapters_manga_id on chapters(manga_id);

create table if not exists pages (
  id bigserial primary key,
  chapter_id bigint not null references chapters(id) on delete cascade,
  number int not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (chapter_id, number)
);

create index if not exists idx_pages_chapter_id on pages(chapter_id);

