-- Convert app_users and all user-linked bigint foreign keys to UUID.
-- Keeps existing rows by backfilling UUIDs and rewiring FKs.

create extension if not exists pgcrypto;

-- app_users: bigserial -> uuid
alter table if exists app_users
  add column if not exists id_uuid uuid;
update app_users set id_uuid = gen_random_uuid() where id_uuid is null;
alter table if exists app_users alter column id_uuid set not null;

do $$
begin
  if exists (select 1 from pg_constraint where conrelid='app_users'::regclass and contype='p') then
    execute 'alter table app_users drop constraint app_users_pkey';
  end if;
exception when undefined_table then end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_name='app_users' and column_name='id') then
    execute 'alter table app_users rename column id to id_bigint';
  end if;
exception when undefined_table then end $$;

alter table if exists app_users rename column id_uuid to id;
alter table if exists app_users add primary key (id);

-- app_users.referred_by_user_id: bigint -> uuid (nullable)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='app_users' and column_name='referred_by_user_id') then
    -- create tmp uuid column
    execute 'alter table app_users add column if not exists referred_by_user_uuid uuid';
    execute $q$
      update app_users u
      set referred_by_user_uuid = r.id
      from app_users r
      where u.referred_by_user_uuid is null
        and u.referred_by_user_id is not null
        and u.referred_by_user_id = r.id_bigint
    $q$;
    execute 'alter table app_users drop column if exists referred_by_user_id';
    execute 'alter table app_users rename column referred_by_user_uuid to referred_by_user_id';
    execute 'create index if not exists app_users_referred_by_idx on app_users (referred_by_user_id)';
  end if;
exception when undefined_table then end $$;

-- Helper macro: convert {table}.user_id bigint -> uuid
-- app_sessions
alter table if exists app_sessions add column if not exists user_uuid uuid;
update app_sessions s
set user_uuid = u.id
from app_users u
where s.user_uuid is null
  and s.user_id = u.id_bigint;
alter table if exists app_sessions alter column user_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='app_sessions'::regclass and contype='f' and conname='app_sessions_user_id_fkey') then
    execute 'alter table app_sessions drop constraint app_sessions_user_id_fkey';
  end if;
exception when undefined_table then end $$;
alter table if exists app_sessions rename column user_id to user_id_bigint;
alter table if exists app_sessions rename column user_uuid to user_id;
alter table if exists app_sessions
  add constraint app_sessions_user_id_fkey foreign key (user_id) references app_users(id) on delete cascade;
drop index if exists idx_app_sessions_user_id;
create index if not exists idx_app_sessions_user_id on app_sessions(user_id);
alter table if exists app_sessions drop column if exists user_id_bigint;

-- app_password_reset_tokens
alter table if exists app_password_reset_tokens add column if not exists user_uuid uuid;
update app_password_reset_tokens t
set user_uuid = u.id
from app_users u
where t.user_uuid is null
  and t.user_id = u.id_bigint;
alter table if exists app_password_reset_tokens alter column user_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='app_password_reset_tokens'::regclass and contype='f' and conname='app_password_reset_tokens_user_id_fkey') then
    execute 'alter table app_password_reset_tokens drop constraint app_password_reset_tokens_user_id_fkey';
  end if;
exception when undefined_table then end $$;
alter table if exists app_password_reset_tokens rename column user_id to user_id_bigint;
alter table if exists app_password_reset_tokens rename column user_uuid to user_id;
alter table if exists app_password_reset_tokens
  add constraint app_password_reset_tokens_user_id_fkey foreign key (user_id) references app_users(id) on delete cascade;
drop index if exists idx_app_password_reset_tokens_user_id;
create index if not exists idx_app_password_reset_tokens_user_id on app_password_reset_tokens(user_id);
alter table if exists app_password_reset_tokens drop column if exists user_id_bigint;

-- coin_ledger
alter table if exists coin_ledger add column if not exists user_uuid uuid;
update coin_ledger l
set user_uuid = u.id
from app_users u
where l.user_uuid is null
  and l.user_id = u.id_bigint;
alter table if exists coin_ledger alter column user_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='coin_ledger'::regclass and contype='f' and conname='coin_ledger_user_id_fkey') then
    execute 'alter table coin_ledger drop constraint coin_ledger_user_id_fkey';
  end if;
exception when undefined_table then end $$;
alter table if exists coin_ledger rename column user_id to user_id_bigint;
alter table if exists coin_ledger rename column user_uuid to user_id;
alter table if exists coin_ledger
  add constraint coin_ledger_user_id_fkey foreign key (user_id) references app_users(id) on delete cascade;
drop index if exists coin_ledger_user_created_at_idx;
create index if not exists coin_ledger_user_created_at_idx on coin_ledger (user_id, created_at desc);
drop index if exists coin_ledger_user_ref_idx;
create index if not exists coin_ledger_user_ref_idx on coin_ledger (user_id, ref_type, ref_id);
drop index if exists coin_ledger_user_bucket_created_at_idx;
create index if not exists coin_ledger_user_bucket_created_at_idx on coin_ledger (user_id, bucket, created_at desc);
alter table if exists coin_ledger drop column if exists user_id_bigint;

-- content_entitlements
alter table if exists content_entitlements add column if not exists user_uuid uuid;
update content_entitlements e
set user_uuid = u.id
from app_users u
where e.user_uuid is null
  and e.user_id = u.id_bigint;
alter table if exists content_entitlements alter column user_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='content_entitlements'::regclass and contype='f' and conname='content_entitlements_user_id_fkey') then
    execute 'alter table content_entitlements drop constraint content_entitlements_user_id_fkey';
  end if;
exception when undefined_table then end $$;
alter table if exists content_entitlements rename column user_id to user_id_bigint;
alter table if exists content_entitlements rename column user_uuid to user_id;
alter table if exists content_entitlements
  add constraint content_entitlements_user_id_fkey foreign key (user_id) references app_users(id) on delete cascade;
alter table if exists content_entitlements drop constraint if exists content_entitlements_user_id_scope_manga_slug_chapter_number_key;
alter table if exists content_entitlements
  add unique (user_id, scope, manga_slug, chapter_number);
drop index if exists content_entitlements_user_slug_idx;
create index if not exists content_entitlements_user_slug_idx on content_entitlements (user_id, manga_slug);
alter table if exists content_entitlements drop column if exists user_id_bigint;

-- daily_coin_claims (PK is user_id)
alter table if exists daily_coin_claims add column if not exists user_uuid uuid;
update daily_coin_claims d
set user_uuid = u.id
from app_users u
where d.user_uuid is null
  and d.user_id = u.id_bigint;
alter table if exists daily_coin_claims alter column user_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='daily_coin_claims'::regclass and contype='p') then
    execute 'alter table daily_coin_claims drop constraint daily_coin_claims_pkey';
  end if;
exception when undefined_table then end $$;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='daily_coin_claims'::regclass and contype='f' and conname='daily_coin_claims_user_id_fkey') then
    execute 'alter table daily_coin_claims drop constraint daily_coin_claims_user_id_fkey';
  end if;
exception when undefined_table then end $$;
alter table if exists daily_coin_claims rename column user_id to user_id_bigint;
alter table if exists daily_coin_claims rename column user_uuid to user_id;
alter table if exists daily_coin_claims add primary key (user_id);
alter table if exists daily_coin_claims
  add constraint daily_coin_claims_user_id_fkey foreign key (user_id) references app_users(id) on delete cascade;
alter table if exists daily_coin_claims drop column if exists user_id_bigint;

-- coin_purchase_intents
alter table if exists coin_purchase_intents add column if not exists user_uuid uuid;
update coin_purchase_intents i
set user_uuid = u.id
from app_users u
where i.user_uuid is null
  and i.user_id = u.id_bigint;
alter table if exists coin_purchase_intents alter column user_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='coin_purchase_intents'::regclass and contype='f' and conname='coin_purchase_intents_user_id_fkey') then
    execute 'alter table coin_purchase_intents drop constraint coin_purchase_intents_user_id_fkey';
  end if;
exception when undefined_table then end $$;
alter table if exists coin_purchase_intents rename column user_id to user_id_bigint;
alter table if exists coin_purchase_intents rename column user_uuid to user_id;
alter table if exists coin_purchase_intents
  add constraint coin_purchase_intents_user_id_fkey foreign key (user_id) references app_users(id) on delete cascade;
drop index if exists coin_purchase_intents_user_created_at_idx;
create index if not exists coin_purchase_intents_user_created_at_idx on coin_purchase_intents (user_id, created_at desc);
alter table if exists coin_purchase_intents drop column if exists user_id_bigint;

-- referral_rewards
alter table if exists referral_rewards add column if not exists referrer_uuid uuid;
alter table if exists referral_rewards add column if not exists referred_uuid uuid;
update referral_rewards r
set referrer_uuid = u.id
from app_users u
where r.referrer_uuid is null
  and r.referrer_user_id = u.id_bigint;
update referral_rewards r
set referred_uuid = u.id
from app_users u
where r.referred_uuid is null
  and r.referred_user_id = u.id_bigint;
alter table if exists referral_rewards alter column referrer_uuid set not null;
alter table if exists referral_rewards alter column referred_uuid set not null;
do $$
begin
  if exists (select 1 from pg_constraint where conrelid='referral_rewards'::regclass and contype='f' and conname='referral_rewards_referrer_user_id_fkey') then
    execute 'alter table referral_rewards drop constraint referral_rewards_referrer_user_id_fkey';
  end if;
  if exists (select 1 from pg_constraint where conrelid='referral_rewards'::regclass and contype='f' and conname='referral_rewards_referred_user_id_fkey') then
    execute 'alter table referral_rewards drop constraint referral_rewards_referred_user_id_fkey';
  end if;
exception when undefined_table then end $$;
alter table if exists referral_rewards rename column referrer_user_id to referrer_user_id_bigint;
alter table if exists referral_rewards rename column referred_user_id to referred_user_id_bigint;
alter table if exists referral_rewards rename column referrer_uuid to referrer_user_id;
alter table if exists referral_rewards rename column referred_uuid to referred_user_id;
alter table if exists referral_rewards
  add constraint referral_rewards_referrer_user_id_fkey foreign key (referrer_user_id) references app_users(id) on delete cascade;
alter table if exists referral_rewards
  add constraint referral_rewards_referred_user_id_fkey foreign key (referred_user_id) references app_users(id) on delete cascade;
drop index if exists referral_rewards_referred_uq;
create unique index if not exists referral_rewards_referred_uq on referral_rewards (referred_user_id);
drop index if exists referral_rewards_referrer_status_idx;
create index if not exists referral_rewards_referrer_status_idx on referral_rewards (referrer_user_id, status, created_at desc);
alter table if exists referral_rewards drop column if exists referrer_user_id_bigint;
alter table if exists referral_rewards drop column if exists referred_user_id_bigint;

-- Finally, drop old bigint column from app_users
alter table if exists app_users drop column if exists id_bigint;
