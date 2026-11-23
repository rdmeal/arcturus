-- One role, database and shadow database for each service with a database.
--
-- Postgres runs this when its volume is empty. It is safe to run again, so after
-- adding a service, apply it to the running container with:
--
--   docker compose exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/01-service-databases.sql
--
-- Passwords are local-only and not secret. Each service's `.env.development`
-- holds the matching connection URLs.

-- Example service (temporary)
select 'create role example with login password ''example'''
where not exists (select from pg_roles where rolname = 'example') \gexec

select 'create database example owner example'
where not exists (select from pg_database where datname = 'example') \gexec

select 'create database example_shadow owner example'
where not exists (select from pg_database where datname = 'example_shadow') \gexec

-- As `graphile-migrate reset` does when it recreates a database.
revoke all on database example from public;
revoke all on database example_shadow from public;
