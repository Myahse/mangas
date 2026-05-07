-- Creator upsert touches synopsis / cover / hero_cover; drifted or hand-built DBs may lack them.
alter table if exists manga add column if not exists synopsis text;
alter table if exists manga add column if not exists cover text;
alter table if exists manga add column if not exists hero_cover text;
alter table if exists manga add column if not exists banner text;
alter table if exists manga add column if not exists status text;
alter table if exists manga add column if not exists title text;
alter table if exists manga add column if not exists slug text;
alter table if exists manga add column if not exists created_at timestamptz not null default now();
alter table if exists manga add column if not exists updated_at timestamptz not null default now();
