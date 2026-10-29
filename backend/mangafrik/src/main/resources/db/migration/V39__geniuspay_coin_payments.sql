-- GeniusPay coin purchases: keep the checkout link and payment time on the intent, and make
-- sure one intent can never credit coins twice (webhooks may be delivered more than once).

alter table if exists coin_purchase_intents add column if not exists checkout_url text;
alter table if exists coin_purchase_intents add column if not exists paid_at timestamptz;

create unique index if not exists coin_purchase_intents_provider_ref_uidx
  on coin_purchase_intents (provider, provider_ref)
  where provider_ref is not null;

create unique index if not exists coin_ledger_purchase_intent_uidx
  on coin_ledger (ref_id)
  where type = 'PURCHASE_TOPUP' and ref_type = 'purchase_intent';
