alter table support_messages add column if not exists attachment_key text;
alter table support_messages add column if not exists attachment_name text;
alter table support_messages add column if not exists attachment_content_type text;
