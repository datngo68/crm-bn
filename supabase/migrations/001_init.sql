-- CRM Inquiry Tracker schema
create extension if not exists "pgcrypto";

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_new boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.inquiry_status as enum ('Pending', 'Ordered', 'Lost', 'No Order');
create type public.new_existing as enum ('New', 'Existing');

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  received_date date not null default current_date,
  new_existing public.new_existing not null default 'New',
  item_code text,
  brand text,
  item_name text not null,
  category text,
  nominated_status text,
  monthly_projection numeric(14,2),
  unit_price_usd numeric(14,4),
  estimated_amount numeric(14,2),
  quoted_date date,
  first_order_date_plan date,
  reason_no_order text,
  action_plan text,
  status public.inquiry_status not null default 'Pending',
  last_follow_up_date date,
  next_follow_up_date date,
  owner text,
  last_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_status_idx on public.inquiries(status);
create index if not exists inquiries_next_fu_idx on public.inquiries(next_follow_up_date);
create index if not exists inquiries_vendor_idx on public.inquiries(vendor_id);

create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  telegram_bot_token text,
  telegram_bot_username text,
  telegram_chat_id text,
  telegram_connected_at timestamptz,
  telegram_connect_code text,
  telegram_connect_expires_at timestamptz,
  remind_per_item_enabled boolean not null default true,
  remind_digest_enabled boolean not null default true,
  digest_hour int not null default 8 check (digest_hour between 0 and 23),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  quiet_hours_enabled boolean not null default true,
  quiet_start int not null default 22 check (quiet_start between 0 and 23),
  quiet_end int not null default 7 check (quiet_end between 0 and 23),
  default_owner text not null default '',
  default_follow_up_days int not null default 3 check (default_follow_up_days between 0 and 90),
  last_digest_date date,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendors_updated_at on public.vendors;
create trigger vendors_updated_at before update on public.vendors
for each row execute function public.set_updated_at();

drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at before update on public.inquiries
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at before update on public.app_settings
for each row execute function public.set_updated_at();

alter table public.vendors enable row level security;
alter table public.inquiries enable row level security;
alter table public.app_settings enable row level security;

create policy "auth all vendors" on public.vendors
  for all to authenticated using (true) with check (true);

create policy "auth all inquiries" on public.inquiries
  for all to authenticated using (true) with check (true);

create policy "auth all settings" on public.app_settings
  for all to authenticated using (true) with check (true);

-- service role bypasses RLS; cron/webhook use service key
