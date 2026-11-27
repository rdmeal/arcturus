--! Previous: sha1:836f3e49831446d03f360ed32a153e83d931c7c0
--! Hash: sha1:9997fa09737d0fd6f9db51e28bb695e03c8109de
--! Message: Add the delivered time and the inbox table

-- Write the migration here, following docs/patterns/database-migration.md.

-- Undo
-- pgls-ignore-start banDropTable: drops only the table this migration creates
drop table if exists inbox_messages cascade;
-- pgls-ignore-end banDropTable

-- Messages received by the example service's inbox. The ID is the sent
-- message's, so a repeated delivery finds its row already there.
create table if not exists inbox_messages (
  id uuid primary key,
  body text not null,
  received_at timestamptz not null
);

-- When the message was delivered to the inbox, or null until it is. Last, so
-- no other statement runs while it holds the table's lock.
alter table messages
  add column if not exists delivered_at timestamptz;
