-- Distinguish coin sources (reward vs paid) and add pending referral rewards.

alter table if exists coin_ledger
  add column if not exists bucket text not null default 'REWARD';

-- Best-effort backfill for existing ledgers.
update coin_ledger
set bucket = case
  when upper(type) = 'PURCHASE_TOPUP' then 'PAID'
  when amount < 0 then 'SPEND'
  else 'REWARD'
end
where bucket is null or trim(bucket) = '';

create index if not exists coin_ledger_user_bucket_created_at_idx
  on coin_ledger (user_id, bucket, created_at desc);

create table if not exists referral_rewards (
  id uuid primary key,
  referrer_user_id bigint not null references app_users(id) on delete cascade,
  referred_user_id bigint not null references app_users(id) on delete cascade,
  amount int not null,
  status text not null default 'pending', -- pending|claimed
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create unique index if not exists referral_rewards_referred_uq
  on referral_rewards (referred_user_id);

create index if not exists referral_rewards_referrer_status_idx
  on referral_rewards (referrer_user_id, status, created_at desc);

