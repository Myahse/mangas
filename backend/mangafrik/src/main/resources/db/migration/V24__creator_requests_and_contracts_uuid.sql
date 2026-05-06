-- Convert creator request + contract IDs from bigserial/bigint to uuid.
-- This keeps existing rows by backfilling UUIDs and rewiring foreign keys.

create extension if not exists pgcrypto;

-- 1) creator_requests: bigserial -> uuid
alter table if exists creator_requests
  add column if not exists id_uuid uuid;

update creator_requests
set id_uuid = gen_random_uuid()
where id_uuid is null;

alter table if exists creator_requests
  alter column id_uuid set not null;

do $$
begin
  -- Drop existing PK if it exists (name is usually creator_requests_pkey).
  if exists (
    select 1 from pg_constraint
    where conrelid = 'creator_requests'::regclass
      and contype = 'p'
  ) then
    execute 'alter table creator_requests drop constraint creator_requests_pkey';
  end if;
exception when undefined_table then
  -- ignore
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'creator_requests' and column_name = 'id'
  ) then
    execute 'alter table creator_requests rename column id to id_bigint';
  end if;
exception when undefined_table then
end $$;

alter table if exists creator_requests
  rename column id_uuid to id;

alter table if exists creator_requests
  add primary key (id);

-- 2) creator_request_contracts: wire FK to UUID and convert PK to UUID too.
alter table if exists creator_request_contracts
  add column if not exists creator_request_uuid uuid;

update creator_request_contracts c
set creator_request_uuid = r.id
from creator_requests r
where c.creator_request_uuid is null
  and c.creator_request_id = r.id_bigint;

alter table if exists creator_request_contracts
  alter column creator_request_uuid set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'creator_request_contracts'::regclass
      and contype = 'f'
      and conname = 'creator_request_contracts_creator_request_id_fkey'
  ) then
    execute 'alter table creator_request_contracts drop constraint creator_request_contracts_creator_request_id_fkey';
  end if;
exception when undefined_table then
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'creator_request_contracts' and column_name = 'creator_request_id'
  ) then
    execute 'alter table creator_request_contracts rename column creator_request_id to creator_request_id_bigint';
  end if;
exception when undefined_table then
end $$;

alter table if exists creator_request_contracts
  rename column creator_request_uuid to creator_request_id;

alter table if exists creator_request_contracts
  add constraint creator_request_contracts_creator_request_id_fkey
  foreign key (creator_request_id) references creator_requests(id) on delete cascade;

-- Convert contract PK (id) from bigserial -> uuid
alter table if exists creator_request_contracts
  add column if not exists id_uuid uuid;

update creator_request_contracts
set id_uuid = gen_random_uuid()
where id_uuid is null;

alter table if exists creator_request_contracts
  alter column id_uuid set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'creator_request_contracts'::regclass
      and contype = 'p'
  ) then
    execute 'alter table creator_request_contracts drop constraint creator_request_contracts_pkey';
  end if;
exception when undefined_table then
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'creator_request_contracts' and column_name = 'id'
  ) then
    execute 'alter table creator_request_contracts rename column id to id_bigint';
  end if;
exception when undefined_table then
end $$;

alter table if exists creator_request_contracts
  rename column id_uuid to id;

alter table if exists creator_request_contracts
  add primary key (id);

-- Cleanup bigint columns (we don't want bigint IDs lingering)
alter table if exists creator_request_contracts
  drop column if exists creator_request_id_bigint;

alter table if exists creator_request_contracts
  drop column if exists id_bigint;

alter table if exists creator_requests
  drop column if exists id_bigint;

create index if not exists idx_creator_request_contracts_request_id
  on creator_request_contracts(creator_request_id);

