-- Schedule CRM reminder job via Supabase pg_cron + pg_net.
-- Replace REPLACE_CRON_SECRET with the value of CRON_SECRET from the app .env.
--
-- Apply:
--   docker exec -i supabase-db psql -U postgres < scripts/schedule-reminders.sql

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'crm-bn-reminders';

SELECT cron.schedule(
  'crm-bn-reminders',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://crm.tudonghoa.me/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'crm-bn-reminders';
