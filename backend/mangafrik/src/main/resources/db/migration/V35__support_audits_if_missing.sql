-- Some databases never ran early migrations that created support_audits; public support then fails on audit insert.
create table if not exists support_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_support_audits_at on support_audits(at desc);
