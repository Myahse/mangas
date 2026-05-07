-- List/featured/popular queries expect these columns; hand-migrated DBs may omit them.
alter table if exists manga add column if not exists author text;
alter table if exists manga add column if not exists artist text;
alter table if exists manga add column if not exists rating numeric(3, 2) not null default 0;
alter table if exists manga add column if not exists views bigint not null default 0;
alter table if exists manga add column if not exists featured boolean not null default false;
alter table if exists manga add column if not exists year int;
