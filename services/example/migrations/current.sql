-- Write the migration here, following docs/patterns/database-migration.md.

-- Undo
drop table if exists messages cascade;

-- Messages sent through the example service. The ID comes from the code.
create table messages (
  id uuid primary key,
  body text not null,
  created_at timestamptz not null default now()
);
