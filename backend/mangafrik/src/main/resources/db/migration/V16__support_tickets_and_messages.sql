create table if not exists support_tickets (
  id uuid primary key,
  type text not null,
  status text not null,
  subject text not null,
  description text not null,
  user_id uuid not null,
  user_name text not null,
  user_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  validation_note text not null default '',
  rejection_reason text not null default ''
);

create index if not exists idx_support_tickets_status on support_tickets(status);
create index if not exists idx_support_tickets_created_at on support_tickets(created_at desc);

create table if not exists support_messages (
  id uuid primary key,
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  at timestamptz not null default now(),
  from_role text not null,
  text text not null
);

create index if not exists idx_support_messages_ticket_at on support_messages(ticket_id, at asc);

create table if not exists support_audits (
  id uuid primary key,
  at timestamptz not null default now(),
  action text not null,
  payload jsonb
);

create index if not exists idx_support_audits_at on support_audits(at desc);

