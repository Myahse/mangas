-- Creator revenue. Rules (configurable, see app.creator.* in application.properties):
--   * readers spend reward (free) coins first; only the part paid with purchased coins earns money;
--   * the series' creator gets 70% of those coins, valued at 7.5 XOF per coin;
--   * creators request a payout from 500 XOF; the finance team pays it by mobile money and marks it paid.
-- User ids are text because app_users.id is bigint on older databases and uuid on newer ones.

-- How each spend was paid (reward coins first), so later spends know how many free coins are left.
create table if not exists coin_spend_splits (
  id uuid primary key,
  user_id text not null,
  type text not null,              -- SPEND_UNLOCK_CHAPTER | SPEND_UNLOCK_MANGA | POLL_VOTE
  ref_type text,
  ref_id text,
  amount int not null,
  reward_part int not null,
  paid_part int not null,
  created_at timestamptz not null default now()
);

create index if not exists coin_spend_splits_user_idx on coin_spend_splits (user_id);

create table if not exists creator_earnings (
  id uuid primary key,
  creator_email text not null,
  manga_slug text not null,
  source_type text not null,       -- same as coin_spend_splits.type
  split_id uuid not null references coin_spend_splits(id) on delete cascade,
  paid_coins int not null,         -- purchased coins the reader spent
  creator_coins numeric(10,2) not null,
  amount_xof numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists creator_earnings_creator_idx on creator_earnings (lower(creator_email), created_at desc);

create table if not exists creator_payouts (
  id uuid primary key,
  creator_email text not null,
  amount_xof numeric(12,2) not null,
  method text not null,            -- wave | orange_money | mtn_money | moov_money
  phone text not null,
  status text not null default 'requested',  -- requested | paid | rejected
  reference text,
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text
);

create index if not exists creator_payouts_creator_idx on creator_payouts (lower(creator_email), created_at desc);
create index if not exists creator_payouts_status_idx on creator_payouts (status, created_at);
