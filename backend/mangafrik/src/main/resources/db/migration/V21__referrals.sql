-- Referral system: each user gets a referral code; new registrations can attach a referrer.

alter table if exists app_users
  add column if not exists referral_code text;

alter table if exists app_users
  add column if not exists referred_by_user_id bigint references app_users(id) on delete set null;

alter table if exists app_users
  add column if not exists referred_at timestamptz;

alter table if exists app_users
  add column if not exists referral_rewarded boolean not null default false;

create unique index if not exists app_users_referral_code_uq
  on app_users (lower(referral_code))
  where referral_code is not null and trim(referral_code) <> '';

create index if not exists app_users_referred_by_idx
  on app_users (referred_by_user_id);

