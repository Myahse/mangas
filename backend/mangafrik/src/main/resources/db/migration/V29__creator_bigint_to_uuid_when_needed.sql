-- When Flyway V24 never ran but legacy bigint rows exist, convert them (same steps as V24).
-- Skips cleanly if creator_requests.id is already uuid.

create extension if not exists pgcrypto;

do $$
declare
  id_udt text;
begin
  select c.udt_name
    into id_udt
  from information_schema.columns c
  where c.table_schema = current_schema()
    and c.table_name = 'creator_requests'
    and c.column_name = 'id';

  if id_udt is null then
    raise notice 'V29: creator_requests missing or no id column — skip';
    return;
  end if;

  if id_udt = 'uuid' then
    raise notice 'V29: creator_requests.id already uuid — skip';
    return;
  end if;

  -- === begin V24-equivalent conversion (non-empty safe) ===

  alter table if exists creator_requests
    add column if not exists id_uuid uuid;

  update creator_requests
  set id_uuid = gen_random_uuid()
  where id_uuid is null;

  alter table if exists creator_requests
    alter column id_uuid set not null;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'creator_requests'::regclass
      and contype = 'p'
  ) then
    alter table creator_requests drop constraint creator_requests_pkey;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'creator_requests'
      and column_name = 'id'
  ) then
    alter table creator_requests rename column id to id_bigint;
  end if;

  alter table if exists creator_requests
    rename column id_uuid to id;

  alter table if exists creator_requests
    add primary key (id);

  if to_regclass(format('%I.creator_request_contracts', current_schema())) is not null then
    alter table creator_request_contracts
      add column if not exists creator_request_uuid uuid;

    update creator_request_contracts c
    set creator_request_uuid = r.id
    from creator_requests r
    where c.creator_request_uuid is null
      and c.creator_request_id = r.id_bigint;

    delete from creator_request_contracts c
    where c.creator_request_uuid is null;

    alter table creator_request_contracts
      alter column creator_request_uuid set not null;

    if exists (
      select 1 from pg_constraint
      where conrelid = 'creator_request_contracts'::regclass
        and contype = 'f'
        and conname = 'creator_request_contracts_creator_request_id_fkey'
    ) then
      alter table creator_request_contracts drop constraint creator_request_contracts_creator_request_id_fkey;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = current_schema()
        and table_name = 'creator_request_contracts'
        and column_name = 'creator_request_id'
    ) then
      alter table creator_request_contracts rename column creator_request_id to creator_request_id_bigint;
    end if;

    alter table creator_request_contracts
      rename column creator_request_uuid to creator_request_id;

    alter table creator_request_contracts
      add constraint creator_request_contracts_creator_request_id_fkey
      foreign key (creator_request_id) references creator_requests(id) on delete cascade;

    alter table creator_request_contracts
      add column if not exists id_uuid uuid;

    update creator_request_contracts
    set id_uuid = gen_random_uuid()
    where id_uuid is null;

    alter table creator_request_contracts
      alter column id_uuid set not null;

    if exists (
      select 1 from pg_constraint
      where conrelid = 'creator_request_contracts'::regclass
        and contype = 'p'
    ) then
      alter table creator_request_contracts drop constraint creator_request_contracts_pkey;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = current_schema()
        and table_name = 'creator_request_contracts'
        and column_name = 'id'
    ) then
      alter table creator_request_contracts rename column id to id_bigint;
    end if;

    alter table creator_request_contracts
      rename column id_uuid to id;

    alter table creator_request_contracts
      add primary key (id);

    alter table creator_request_contracts
      drop column if exists creator_request_id_bigint;

    alter table creator_request_contracts
      drop column if exists id_bigint;

    create index if not exists idx_creator_request_contracts_request_id
      on creator_request_contracts(creator_request_id);
  end if;

  alter table if exists creator_requests
    drop column if exists id_bigint;

  raise notice 'V29: creator_requests / creator_request_contracts converted to uuid';
end $$;
