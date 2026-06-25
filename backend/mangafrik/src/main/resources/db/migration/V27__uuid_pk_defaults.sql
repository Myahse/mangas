-- Ensure UUID primary keys have defaults for new inserts.

create extension if not exists pgcrypto;

alter table if exists app_users
  alter column id set default gen_random_uuid();

alter table if exists manga
  alter column id set default gen_random_uuid();

alter table if exists genres
  alter column id set default gen_random_uuid();

alter table if exists chapters
  alter column id set default gen_random_uuid();

alter table if exists pages
  alter column id set default gen_random_uuid();

alter table if exists creator_request_contracts
  alter column id set default gen_random_uuid();

