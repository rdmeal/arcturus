--! Previous: sha1:836f3e49831446d03f360ed32a153e83d931c7c0
--! Hash: sha1:c187c27d908560e12d42faa660d27a2ac04ec585
--! Message: Lint demo

-- Write the migration here, following docs/patterns/database-migration.md.

-- Undo
-- pgls-ignore-start banDropTable: the undo section drops only what this migration creates
drop table if exists lint_demo cascade;
-- pgls-ignore-end banDropTable

create table lint_demo (id uuid primary key);
