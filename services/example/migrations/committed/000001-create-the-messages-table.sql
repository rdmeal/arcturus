--! Previous: -
--! Hash: sha1:836f3e49831446d03f360ed32a153e83d931c7c0
--! Message: Create the messages table

-- Write the migration here, following docs/patterns/database-migration.md.

-- Undo
drop table if exists messages cascade;

-- Messages sent through the example service. The ID comes from the code.
create table messages (
  id uuid primary key,
  body text not null,
  created_at timestamptz not null default now()
);
