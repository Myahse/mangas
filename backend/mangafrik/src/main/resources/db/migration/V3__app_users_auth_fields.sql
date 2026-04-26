

alter table if exists app_users
  add column if not exists role text not null default 'reader';

alter table if exists app_users
  add column if not exists password_hash text;

alter table if exists app_users
  add column if not exists profile jsonb not null default '{}'::jsonb;

alter table if exists app_users
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_app_users_created_at on app_users(created_at desc);

