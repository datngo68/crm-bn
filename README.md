# CRM Inquiry Tracker

Theo dõi inquiry / báo giá theo Vendor, Status, follow-up Telegram, export Excel.

## Stack

- Next.js + Supabase Auth/Postgres
- Telegram bot (kết nối bằng link Start)
- Docker trên VPS

## Setup nhanh

1. Copy `.env.example` → `.env` và điền Supabase + secrets.
2. Chạy SQL trong `supabase/migrations/001_init.sql` trên Supabase.
3. Tạo user Auth (email/password) trong Supabase Dashboard.
4. Local: `npm i && npm run dev`
5. Production: `docker compose up -d --build`
6. Cron mỗi 15 phút:

```bash
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/reminders"
```

7. Trong app → **Cài đặt**: dán Bot Token (BotFather) → **Kết nối Telegram** → Start.
