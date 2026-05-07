create table if not exists creator_requests (
  id bigserial primary key,
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

create index if not exists idx_creator_requests_status_created_at on creator_requests(status, created_at desc);

