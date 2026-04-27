create table if not exists app_password_reset_tokens (
  token uuid primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_app_password_reset_tokens_user_id on app_password_reset_tokens(user_id);
create index if not exists idx_app_password_reset_tokens_expires_at on app_password_reset_tokens(expires_at);
create index if not exists idx_app_password_reset_tokens_used_at on app_password_reset_tokens(used_at);

