-- Repair panel tables when early migrations (V2/V19) were skipped or only partially applied.
-- Java services expect ads_* and admin_manga_requests; V2 used legacy names (hero_ads, system_notices, ...).

create extension if not exists pgcrypto;

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

-- Copy legacy V2 rows into ads_* tables when the new tables are still empty.
insert into ads_hero_ads (id, title, subtitle, image_url, cta_label, cta_url, status, starts_at, ends_at, created_at, updated_at)
select h.id, h.title, h.subtitle, h.image_url, h.cta_label, h.cta_url, h.status, h.starts_at, h.ends_at, h.created_at, h.updated_at
from hero_ads h
where exists (
  select 1 from information_schema.tables
  where table_schema = current_schema() and table_name = 'hero_ads'
)
and not exists (select 1 from ads_hero_ads limit 1);

insert into ads_notifications (id, channel, title, body, target, segment, user_id, deep_link, status, scheduled_at, created_at, updated_at)
select n.id, n.channel, n.title, n.body, n.target, n.segment, n.user_id, n.deep_link, n.status, n.scheduled_at, n.created_at, n.updated_at
from notifications n
where exists (
  select 1 from information_schema.tables
  where table_schema = current_schema() and table_name = 'notifications'
)
and not exists (select 1 from ads_notifications limit 1);

insert into ads_system_notices (id, severity, title, message, status, starts_at, ends_at, created_at, updated_at)
select s.id, s.severity, s.title, s.message, s.status, s.starts_at, s.ends_at, s.created_at, s.updated_at
from system_notices s
where exists (
  select 1 from information_schema.tables
  where table_schema = current_schema() and table_name = 'system_notices'
)
and not exists (select 1 from ads_system_notices limit 1);

insert into ads_hero_ads (id, title, subtitle, image_url, cta_label, cta_url, status, starts_at, ends_at)
values ('11111111-1111-1111-1111-111111111111', 'Welcome promo', 'New chapters every week', '', 'Explore', '/explore', 'active', now()::text, '')
on conflict (id) do nothing;

insert into ads_notifications (id, channel, title, body, target, segment, user_id, deep_link, status, scheduled_at)
values ('22222222-2222-2222-2222-222222222222', 'push', 'New release', 'A new manga chapter is out now.', 'all', '', '', '/home', 'draft', '')
on conflict (id) do nothing;

insert into ads_system_notices (id, severity, title, message, status, starts_at, ends_at)
values ('33333333-3333-3333-3333-333333333333', 'info', 'Maintenance window', 'Scheduled maintenance tonight at 02:00 UTC.', 'scheduled', now()::text, '')
on conflict (id) do nothing;

insert into admin_manga_requests (id, requested_title, requested_by, notes, status)
values ('44444444-4444-4444-4444-444444444444', 'Nouchi Legends', 'reader1@example.com', 'Could you add this manga? I heard it is great.', 'new')
on conflict (id) do nothing;
