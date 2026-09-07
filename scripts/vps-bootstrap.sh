#!/usr/bin/env bash
set -euo pipefail
APP_DIR=/home/ubuntu/crm-bn
DOMAIN=crm.tudonghoa.me
cd "$APP_DIR"
docker compose up -d --build
# Reminders: prefer Supabase pg_cron + pg_net (see scripts/schedule-reminders.sql).
# OS crontab is a fallback only if pg_cron is unavailable.
echo "Deployed $DOMAIN"
