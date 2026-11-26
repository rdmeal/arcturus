--! Previous: sha1:836f3e49831446d03f360ed32a153e83d931c7c0
--! Hash: sha1:f1bf84ab5729758c02671505ff3ad29d21137942
--! Message: Format demo

-- Write the migration here, following docs/patterns/database-migration.md.

-- Undo
-- pgls-ignore-start banDropTable: the undo section drops only what this migration creates
drop table if exists lint_demo cascade;
-- pgls-ignore-end banDropTable

CREATE TABLE IF NOT EXISTS lint_demo (id UUID PRIMARY KEY);
