create table if not exists app_feature_flags (
  key text primary key,
  enabled boolean not null,
  updated_at timestamptz not null default now()
);

-- Seed defaults for coins-related features (can be changed at runtime).
insert into app_feature_flags (key, enabled)
values
  ('coins.rewards.enabled', true),
  ('coins.payments.enabled', false)
on conflict (key) do nothing;

