create table if not exists app_sessions (
  token uuid primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_app_sessions_user_id on app_sessions(user_id);
create index if not exists idx_app_sessions_expires_at on app_sessions(expires_at);

