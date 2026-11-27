-- Ospod: give the server-side admin role (service_role) access to every table.
--
-- This project doesn't grant new tables to any API role automatically. Background jobs
-- (episode processing on Trigger.dev) and future billing webhooks connect with the
-- secret key, which acts as service_role and bypasses row level security, but it still
-- needs table privileges. Safe to run more than once.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- And for everything created from now on.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
