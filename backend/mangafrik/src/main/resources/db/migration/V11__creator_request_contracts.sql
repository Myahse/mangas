create table if not exists creator_request_contracts (
  id bigserial primary key,
  creator_request_id bigint not null references creator_requests(id) on delete cascade,
  token uuid not null unique,
  status text not null default 'sent', -- sent | creator_signed | fully_signed
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

create index if not exists idx_creator_request_contracts_request_id on creator_request_contracts(creator_request_id);

