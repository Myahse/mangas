create table if not exists finance_transactions (
  id uuid primary key,
  type text not null,
  amount numeric(18,2) not null,
  currency text not null,
  reference text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists finance_transactions_created_at_idx
  on finance_transactions (created_at desc);

