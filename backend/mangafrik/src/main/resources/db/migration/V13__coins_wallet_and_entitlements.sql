create table if not exists coin_ledger (
  id uuid primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  type text not null,
  amount int not null,
  ref_type text,
  ref_id text,
  created_at timestamptz not null default now()
);

create index if not exists coin_ledger_user_created_at_idx
  on coin_ledger (user_id, created_at desc);

create index if not exists coin_ledger_user_ref_idx
  on coin_ledger (user_id, ref_type, ref_id);

create table if not exists content_entitlements (
  id uuid primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  scope text not null, -- MANGA | CHAPTER
  manga_slug text not null,
  chapter_number int not null default -1, -- for scope=MANGA store -1
  unlocked_at timestamptz not null default now(),
  unique (user_id, scope, manga_slug, chapter_number)
);

-- Ensure consistent values: MANGA uses chapter_number=-1, CHAPTER uses chapter_number>=1.
alter table content_entitlements
  drop constraint if exists content_entitlements_scope_chapter_ck;
alter table content_entitlements
  add constraint content_entitlements_scope_chapter_ck
  check (
    (upper(scope) = 'MANGA' and chapter_number = -1)
    or
    (upper(scope) = 'CHAPTER' and chapter_number >= 1)
  );

create index if not exists content_entitlements_user_slug_idx
  on content_entitlements (user_id, manga_slug);

create table if not exists daily_coin_claims (
  user_id bigint primary key references app_users(id) on delete cascade,
  last_claim_date date not null
);

