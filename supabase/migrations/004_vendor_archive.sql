-- Soft-archive vendors (cascade handled in app: hide vendor → hide its inquiries)
alter table public.vendors
  add column if not exists archived_at timestamptz;

create index if not exists vendors_archived_idx
  on public.vendors (archived_at)
  where archived_at is null;
