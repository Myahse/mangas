-- Ensure app_users has the columns used by Auth/Admin services.
-- Earlier versions created only minimal columns.

alter table if exists creator_requests
  add column if not exists creator_email text;

alter table if exists app_users
  add column if not exists role text not null default 'reader';

alter table if exists app_users
  add column if not exists status text not null default 'active';

alter table if exists app_users
  add column if not exists password_hash text;

alter table if exists app_users
  add column if not exists must_change_password boolean not null default false;

alter table if exists app_users
  add column if not exists password_changed_at timestamptz;

alter table if exists app_users
  add column if not exists profile jsonb not null default '{}'::jsonb;

alter table if exists app_users
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_app_users_role on app_users(role);
create index if not exists idx_app_users_status on app_users(status);

