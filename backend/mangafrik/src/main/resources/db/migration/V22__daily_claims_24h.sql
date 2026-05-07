-- Switch daily reward from "once per UTC day" to "once per rolling 24h".

alter table if exists daily_coin_claims
  add column if not exists last_claim_at timestamptz;

-- Backfill: convert last_claim_date (legacy) to last_claim_at at 00:00 UTC.
-- This is best-effort; exact time is unknown so we choose a stable reference.
update daily_coin_claims
set last_claim_at = (last_claim_date::timestamp at time zone 'UTC')
where last_claim_at is null;

