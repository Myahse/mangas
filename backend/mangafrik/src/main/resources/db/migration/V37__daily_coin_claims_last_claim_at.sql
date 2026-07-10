alter table if exists daily_coin_claims
  add column if not exists last_claim_at timestamptz;
