-- Griot mode: recorded voices for speech bubbles. lang is a translation language code, or 'orig'
-- for the original text. Like translations, a recording waits for the series' creator (or staff),
-- only one recording per bubble and language is live, and an approved one pays its narrator once.

create table if not exists bubble_audio (
  id uuid primary key,
  bubble_id uuid not null references page_bubbles(id) on delete cascade,
  lang text not null,
  url text not null,
  duration_ms int not null default 0,
  narrator_id text not null,
  status text not null default 'pending',  -- pending | approved | rejected | superseded
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bubble_id, lang, narrator_id)
);

create index if not exists bubble_audio_status_idx on bubble_audio (status, created_at);
create unique index if not exists bubble_audio_one_approved_uidx
  on bubble_audio (bubble_id, lang) where status = 'approved';
