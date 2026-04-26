-- Password policy flags (first login password change, etc.)

alter table if exists app_users
  add column if not exists must_change_password boolean not null default false;

alter table if exists app_users
  add column if not exists password_changed_at timestamptz;

