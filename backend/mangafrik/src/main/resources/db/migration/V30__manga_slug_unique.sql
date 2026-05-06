-- Creator/admin manga upserts use ON CONFLICT (slug). Postgres requires a unique index on slug.
-- Skip if an existing unique index on slug is already present (e.g. V1 inline UNIQUE → manga_slug_key).

do $$
begin
  if exists (
    select 1
    from pg_indexes i
    where i.schemaname = any (current_schemas(false))
      and i.tablename = 'manga'
      and i.indexdef ~* 'unique'
      and i.indexdef ~* 'slug'
  ) then
    return;
  end if;
  create unique index uq_manga_slug on manga (slug);
end $$;
