create table if not exists coin_purchase_intents (
  id uuid primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  pack_id text not null,
  coins int not null,
  currency text not null default 'XOF',
  amount int not null, -- fiat amount in currency minor unit (XOF has no decimals)
  status text not null default 'pending', -- pending|paid|cancelled
  provider text not null default 'manual', -- manual|flutterwave|...
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coin_purchase_intents_user_created_at_idx
  on coin_purchase_intents (user_id, created_at desc);

create index if not exists coin_purchase_intents_status_idx
  on coin_purchase_intents (status);

