#!/usr/bin/env bash
set -euo pipefail
APP_DIR=/home/ubuntu/crm-bn
DOMAIN=crm.tudonghoa.me
cd "$APP_DIR"
docker compose up -d --build
# cron every 15 min
CRON_LINE="*/15 * * * * curl -fsS -X POST -H \"Authorization: Bearer \$(grep ^CRON_SECRET $APP_DIR/.env | cut -d= -f2-)\" https://$DOMAIN/api/cron/reminders >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v '/api/cron/reminders' || true; echo "$CRON_LINE") | crontab -
echo "Deployed $DOMAIN"
