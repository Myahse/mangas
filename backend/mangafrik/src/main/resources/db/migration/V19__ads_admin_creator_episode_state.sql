-- Make panel state horizontally scalable by persisting it in Postgres.
-- These tables back the previously in-memory stores (ads/admin/creator/episodes).

-- UUID generation for seeded rows / convenience.
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ads panel state
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists ads_hero_ads (
  id uuid primary key,
  title text not null,
  subtitle text not null default '',
  image_url text not null default '',
  cta_label text not null default 'Learn more',
  cta_url text not null default '/',
  status text not null default 'paused',
  starts_at text not null default '',
  ends_at text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ads_hero_ads_updated_at on ads_hero_ads(updated_at desc);

create table if not exists ads_notifications (
  id uuid primary key,
  channel text not null default 'push',
  title text not null,
  body text not null default '',
  target text not null default 'all',
  segment text not null default '',
  user_id text not null default '',
  deep_link text not null default '',
  status text not null default 'draft',
  scheduled_at text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ads_notifications_updated_at on ads_notifications(updated_at desc);

create table if not exists ads_system_notices (
  id uuid primary key,
  severity text not null default 'info',
  title text not null,
  message text not null default '',
  status text not null default 'scheduled',
  starts_at text not null default '',
  ends_at text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ads_system_notices_updated_at on ads_system_notices(updated_at desc);
create index if not exists idx_ads_system_notices_status on ads_system_notices(status);

create table if not exists ads_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_ads_audits_at on ads_audits(at desc);

-- Seed minimal demo rows (idempotent).
insert into ads_hero_ads (id, title, subtitle, image_url, cta_label, cta_url, status, starts_at, ends_at)
values ('11111111-1111-1111-1111-111111111111', 'Welcome promo', 'New chapters every week', '', 'Explore', '/explore', 'active', now()::text, '')
on conflict (id) do nothing;

insert into ads_notifications (id, channel, title, body, target, segment, user_id, deep_link, status, scheduled_at)
values ('22222222-2222-2222-2222-222222222222', 'push', 'New release', 'A new manga chapter is out now.', 'all', '', '', '/home', 'draft', '')
on conflict (id) do nothing;

insert into ads_system_notices (id, severity, title, message, status, starts_at, ends_at)
values ('33333333-3333-3333-3333-333333333333', 'info', 'Maintenance window', 'Scheduled maintenance tonight at 02:00 UTC.', 'scheduled', now()::text, '')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin panel demo state
-- - Admin users are stored in app_users (already existing).
-- - Manga are stored in manga (already existing).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists admin_manga_requests (
  id uuid primary key,
  requested_title text not null,
  requested_by text not null,
  notes text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_manga_requests_created_at on admin_manga_requests(created_at desc);
create index if not exists idx_admin_manga_requests_status on admin_manga_requests(status);

create table if not exists admin_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_admin_audits_at on admin_audits(at desc);

insert into admin_manga_requests (id, requested_title, requested_by, notes, status)
values ('44444444-4444-4444-4444-444444444444', 'Nouchi Legends', 'reader1@example.com', 'Could you add this manga? I heard it is great.', 'new')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Creator panel demo state
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists creator_manga_submissions (
  id uuid primary key,
  status text not null default 'approved',
  created_at timestamptz not null default now(),
  creator_email text not null default '',
  creator_display_name text not null default '',
  payload jsonb not null default '{}'::jsonb,
  moderation_decision text,
  moderation_reason text not null default '',
  moderation_reviewed_at timestamptz
);

create index if not exists idx_creator_manga_submissions_created_at on creator_manga_submissions(created_at desc);
create index if not exists idx_creator_manga_submissions_creator_email on creator_manga_submissions(lower(creator_email));

create table if not exists creator_episode_drafts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  series_title text not null default '',
  episode_title text not null default '',
  creator_note text,
  comments_enabled boolean not null default true,
  publish_mode text not null default '',
  publish_at text not null default '',
  thumb jsonb,
  images jsonb not null default '[]'::jsonb
);

create index if not exists idx_creator_episode_drafts_created_at on creator_episode_drafts(created_at desc);

create table if not exists creator_published_episodes (
  id uuid primary key,
  published_at timestamptz not null default now(),
  scheduled_for text,
  series_title text not null default '',
  episode_title text not null default '',
  creator_note text,
  comments_enabled boolean not null default true,
  thumb jsonb,
  images jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  comments jsonb not null default '[]'::jsonb
);

create index if not exists idx_creator_published_episodes_published_at on creator_published_episodes(published_at desc);

