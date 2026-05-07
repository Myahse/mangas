
create table if not exists admin_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_admin_audits_at on admin_audits (at desc);
