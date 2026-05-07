alter table if exists creator_request_contracts
  add column if not exists admin_signer_name text;

alter table if exists creator_request_contracts
  add column if not exists admin_signature_data text;

alter table if exists creator_request_contracts
  add column if not exists admin_signed_at timestamptz;

alter table if exists creator_request_contracts
  add column if not exists admin_signer_ip text;

alter table if exists creator_request_contracts
  add column if not exists admin_signer_user_agent text;

