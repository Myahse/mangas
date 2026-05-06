-- Convert core content tables from bigserial/bigint IDs to UUID.
-- Tables: manga, genres, chapters, pages, manga_genres
-- Keeps existing rows by backfilling UUIDs and rewiring foreign keys.

create extension if not exists pgcrypto;

-- manga: bigserial -> uuid
alter table if exists manga
  add column if not exists id_uuid uuid;
update manga set id_uuid = gen_random_uuid() where id_uuid is null;
alter table if exists manga alter column id_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='manga'::regclass and contype='p') then
    execute 'alter table manga drop constraint manga_pkey';
  end if;
exception when undefined_table then end $$;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='manga' and column_name='id') then
    execute 'alter table manga rename column id to id_bigint';
  end if;
exception when undefined_table then end $$;
alter table if exists manga rename column id_uuid to id;
alter table if exists manga add primary key (id);

-- genres: bigserial -> uuid
alter table if exists genres
  add column if not exists id_uuid uuid;
update genres set id_uuid = gen_random_uuid() where id_uuid is null;
alter table if exists genres alter column id_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='genres'::regclass and contype='p') then
    execute 'alter table genres drop constraint genres_pkey';
  end if;
exception when undefined_table then end $$;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='genres' and column_name='id') then
    execute 'alter table genres rename column id to id_bigint';
  end if;
exception when undefined_table then end $$;
alter table if exists genres rename column id_uuid to id;
alter table if exists genres add primary key (id);

-- chapters: rewire manga_id then bigserial -> uuid
alter table if exists chapters
  add column if not exists manga_uuid uuid;
update chapters c
set manga_uuid = m.id
from manga m
where c.manga_uuid is null
  and c.manga_id = m.id_bigint;
alter table if exists chapters alter column manga_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='chapters'::regclass and contype='f' and conname='chapters_manga_id_fkey') then
    execute 'alter table chapters drop constraint chapters_manga_id_fkey';
  end if;
exception when undefined_table then end $$;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='chapters' and column_name='manga_id') then
    execute 'alter table chapters rename column manga_id to manga_id_bigint';
  end if;
exception when undefined_table then end $$;
alter table if exists chapters rename column manga_uuid to manga_id;
alter table if exists chapters
  add constraint chapters_manga_id_fkey foreign key (manga_id) references manga(id) on delete cascade;

alter table if exists chapters add column if not exists id_uuid uuid;
update chapters set id_uuid = gen_random_uuid() where id_uuid is null;
alter table if exists chapters alter column id_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='chapters'::regclass and contype='p') then
    execute 'alter table chapters drop constraint chapters_pkey';
  end if;
exception when undefined_table then end $$;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='chapters' and column_name='id') then
    execute 'alter table chapters rename column id to id_bigint';
  end if;
exception when undefined_table then end $$;
alter table if exists chapters rename column id_uuid to id;
alter table if exists chapters add primary key (id);

-- pages: rewire chapter_id then bigserial -> uuid
alter table if exists pages
  add column if not exists chapter_uuid uuid;
update pages p
set chapter_uuid = c.id
from chapters c
where p.chapter_uuid is null
  and p.chapter_id = c.id_bigint;
alter table if exists pages alter column chapter_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='pages'::regclass and contype='f' and conname='pages_chapter_id_fkey') then
    execute 'alter table pages drop constraint pages_chapter_id_fkey';
  end if;
exception when undefined_table then end $$;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='pages' and column_name='chapter_id') then
    execute 'alter table pages rename column chapter_id to chapter_id_bigint';
  end if;
exception when undefined_table then end $$;
alter table if exists pages rename column chapter_uuid to chapter_id;
alter table if exists pages
  add constraint pages_chapter_id_fkey foreign key (chapter_id) references chapters(id) on delete cascade;

alter table if exists pages add column if not exists id_uuid uuid;
update pages set id_uuid = gen_random_uuid() where id_uuid is null;
alter table if exists pages alter column id_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='pages'::regclass and contype='p') then
    execute 'alter table pages drop constraint pages_pkey';
  end if;
exception when undefined_table then end $$;
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='pages' and column_name='id') then
    execute 'alter table pages rename column id to id_bigint';
  end if;
exception when undefined_table then end $$;
alter table if exists pages rename column id_uuid to id;
alter table if exists pages add primary key (id);

-- manga_genres: rewire both FKs and PK
alter table if exists manga_genres
  add column if not exists manga_uuid uuid;
alter table if exists manga_genres
  add column if not exists genre_uuid uuid;

update manga_genres mg
set manga_uuid = m.id
from manga m
where mg.manga_uuid is null
  and mg.manga_id = m.id_bigint;

update manga_genres mg
set genre_uuid = g.id
from genres g
where mg.genre_uuid is null
  and mg.genre_id = g.id_bigint;

alter table if exists manga_genres alter column manga_uuid set not null;
alter table if exists manga_genres alter column genre_uuid set not null;

do $$
begin
  if exists (select 1 from pg_constraint where conrelid='manga_genres'::regclass and contype='p') then
    execute 'alter table manga_genres drop constraint manga_genres_pkey';
  end if;
exception when undefined_table then end $$;

do $$
begin
  if exists (select 1 from pg_constraint where conrelid='manga_genres'::regclass and contype='f' and conname='manga_genres_manga_id_fkey') then
    execute 'alter table manga_genres drop constraint manga_genres_manga_id_fkey';
  end if;
  if exists (select 1 from pg_constraint where conrelid='manga_genres'::regclass and contype='f' and conname='manga_genres_genre_id_fkey') then
    execute 'alter table manga_genres drop constraint manga_genres_genre_id_fkey';
  end if;
exception when undefined_table then end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_name='manga_genres' and column_name='manga_id') then
    execute 'alter table manga_genres rename column manga_id to manga_id_bigint';
  end if;
  if exists (select 1 from information_schema.columns where table_name='manga_genres' and column_name='genre_id') then
    execute 'alter table manga_genres rename column genre_id to genre_id_bigint';
  end if;
exception when undefined_table then end $$;

alter table if exists manga_genres rename column manga_uuid to manga_id;
alter table if exists manga_genres rename column genre_uuid to genre_id;

alter table if exists manga_genres
  add constraint manga_genres_manga_id_fkey foreign key (manga_id) references manga(id) on delete cascade;
alter table if exists manga_genres
  add constraint manga_genres_genre_id_fkey foreign key (genre_id) references genres(id) on delete cascade;

alter table if exists manga_genres
  add primary key (manga_id, genre_id);

-- Drop old bigint columns
alter table if exists manga_genres drop column if exists manga_id_bigint;
alter table if exists manga_genres drop column if exists genre_id_bigint;
alter table if exists pages drop column if exists chapter_id_bigint;
alter table if exists pages drop column if exists id_bigint;
alter table if exists chapters drop column if exists manga_id_bigint;
alter table if exists chapters drop column if exists id_bigint;
alter table if exists genres drop column if exists id_bigint;
alter table if exists manga drop column if exists id_bigint;

-- Recreate helpful indexes (harmless if exist)
create index if not exists idx_chapters_manga_id on chapters(manga_id);
create index if not exists idx_pages_chapter_id on pages(chapter_id);
