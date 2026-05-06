-- Repair databases stuck between Flyway V8/V11 (bigint IDs) and app code expecting UUID (V24+).
-- Safe only when affected tables are empty; matches runtime repair in CreatorRequestService / CreatorContractService.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass(format('%I.creator_requests', current_schema())) is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema = current_schema()
        and table_name = 'creator_requests'
        and column_name = 'id'
        and udt_name <> 'uuid'
    ) and not exists (select 1 from creator_requests limit 1) then
      execute 'drop table if exists creator_request_contracts cascade';
      execute 'drop table creator_requests cascade';
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass(format('%I.creator_request_contracts', current_schema())) is null then
    return;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'creator_request_contracts'
      and column_name = 'creator_request_id'
      and udt_name <> 'uuid'
  ) then
    return;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'creator_requests'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) and not exists (select 1 from creator_request_contracts limit 1) then
    execute 'drop table creator_request_contracts';
  end if;
end $$;

create table if not exists creator_requests (
  id uuid primary key,
  email text not null,
  creator_email text,
  display_name text not null,
  pen_name text,
  genres text,
  message text,
  status text not null default 'pending',
  review_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table if exists creator_requests
  add column if not exists creator_email text;

create index if not exists idx_creator_requests_status_created_at
  on creator_requests(status, created_at desc);

create table if not exists creator_request_contracts (
  id uuid primary key,
  creator_request_id uuid not null references creator_requests(id) on delete cascade,
  token uuid not null unique,
  status text not null default 'sent',
  contract_html text not null,
  signer_name text,
  signature_data text,
  signed_at timestamptz,
  signer_ip text,
  signer_user_agent text,
  admin_signer_name text,
  admin_signature_data text,
  admin_signed_at timestamptz,
  admin_signer_ip text,
  admin_signer_user_agent text,
  created_at timestamptz not null default now()
);

alter table if exists creator_request_contracts add column if not exists admin_signer_name text;
alter table if exists creator_request_contracts add column if not exists admin_signature_data text;
alter table if exists creator_request_contracts add column if not exists admin_signed_at timestamptz;
alter table if exists creator_request_contracts add column if not exists admin_signer_ip text;
alter table if exists creator_request_contracts add column if not exists admin_signer_user_agent text;

create index if not exists idx_creator_request_contracts_request_id
  on creator_request_contracts(creator_request_id);
