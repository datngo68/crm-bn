-- Enable pg_cron (available on self-hosted Supabase; not enabled by default)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;

-- Job is scheduled at deploy time (needs CRON_SECRET + APP_URL from env).
-- See scripts/schedule-reminders.sql / VPS bootstrap.
