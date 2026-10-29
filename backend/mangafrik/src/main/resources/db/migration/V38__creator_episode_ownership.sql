-- Record which creator owns each draft / published episode (until now every creator saw all of them).

alter table if exists creator_episode_drafts add column if not exists creator_email text;
alter table if exists creator_published_episodes add column if not exists creator_email text;

-- Backfill from the creator who submitted the series with the same title (latest submission wins).
with owners as (
  select distinct on (lower(trim(payload->>'title')))
    lower(trim(payload->>'title')) as title_key,
    creator_email
  from creator_manga_submissions
  where creator_email is not null and coalesce(trim(payload->>'title'), '') <> ''
  order by lower(trim(payload->>'title')), created_at desc
)
update creator_published_episodes e
set creator_email = o.creator_email
from owners o
where e.creator_email is null
  and lower(trim(e.series_title)) = o.title_key;

with owners as (
  select distinct on (lower(trim(payload->>'title')))
    lower(trim(payload->>'title')) as title_key,
    creator_email
  from creator_manga_submissions
  where creator_email is not null and coalesce(trim(payload->>'title'), '') <> ''
  order by lower(trim(payload->>'title')), created_at desc
)
update creator_episode_drafts d
set creator_email = o.creator_email
from owners o
where d.creator_email is null
  and lower(trim(d.series_title)) = o.title_key;

create index if not exists idx_creator_episode_drafts_creator_email
  on creator_episode_drafts (lower(creator_email));
create index if not exists idx_creator_published_episodes_creator_email
  on creator_published_episodes (lower(creator_email));
