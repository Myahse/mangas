

alter table if exists app_users
  add column if not exists roles text[] not null default '{reader}';


update app_users
set roles = array[coalesce(nullif(trim(role), ''), 'reader')]
where (roles is null) or (array_length(roles, 1) is null) or (roles = '{}'::text[]);

create index if not exists idx_app_users_roles on app_users using gin (roles);

