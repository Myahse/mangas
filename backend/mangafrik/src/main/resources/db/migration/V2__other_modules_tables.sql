-- Additional module tables (ads, support, creator, admin).
-- Kept flexible because current services are still in-memory.

-- Ads
create table if not exists hero_ads (
  id uuid primary key,
  title text not null,
  subtitle text not null default '',
  image_url text not null default '',
  cta_label text not null default '',
  cta_url text not null default '',
  status text not null default 'paused',
  starts_at text not null default '',
  ends_at text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key,
  channel text not null,          -- push | in_app
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

create table if not exists system_notices (
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

create table if not exists ads_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb not null default '{}'::jsonb
);

-- Support
create table if not exists support_tickets (
  id uuid primary key,
  type text not null default 'issue',
  status text not null default 'new',
  subject text not null,
  description text not null default '',
  user_id uuid,
  user_name text not null default '',
  user_email text not null default '',
  validation_note text not null default '',
  rejection_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_status on support_tickets(status);

create table if not exists support_messages (
  id uuid primary key,
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  at timestamptz not null default now(),
  from_role text not null, -- support | user
  text text not null
);

create index if not exists idx_support_messages_ticket on support_messages(ticket_id, at);

create table if not exists support_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb not null default '{}'::jsonb
);

-- Creator submissions
create table if not exists creator_submissions (
  id uuid primary key,
  status text not null default 'pending',
  creator_email text not null default '',
  creator_display_name text not null default '',
  payload jsonb not null default '{}'::jsonb,
  moderation_decision text,
  moderation_reason text not null default '',
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_submissions_creator on creator_submissions(creator_email);

-- Creator episodes (drafts + published)
create table if not exists episode_drafts (
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

create table if not exists published_episodes (
  id uuid primary key,
  published_at timestamptz not null default now(),
  scheduled_for text,
  series_title text not null default '',
  episode_title text not null default '',
  creator_note text,
  comments_enabled boolean not null default true,
  thumb jsonb,
  images jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb
);

create table if not exists episode_comments (
  id uuid primary key,
  episode_id uuid not null references published_episodes(id) on delete cascade,
  created_at timestamptz not null default now(),
  author text,
  text text not null
);

create index if not exists idx_episode_comments_episode on episode_comments(episode_id, created_at);

-- Admin module
create table if not exists admin_users (
  id uuid primary key,
  email text not null,
  display_name text not null default '',
  role text not null default 'reader',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  source text not null default ''
);

create unique index if not exists idx_admin_users_email on admin_users(email);

create table if not exists admin_creator_requests (
  id uuid primary key,
  email text not null,
  display_name text not null default '',
  status text not null default 'pending',
  reason text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists admin_manga_requests (
  id uuid primary key,
  requested_title text not null,
  requested_by text not null,
  notes text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists admin_mangas (
  id uuid primary key,
  title text not null,
  slug text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_admin_mangas_slug on admin_mangas(slug);

create table if not exists admin_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb not null default '{}'::jsonb
);

