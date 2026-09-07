-- Soft-delete / archive (hide without destroying history)
alter table public.inquiries
  add column if not exists archived_at timestamptz;

create index if not exists inquiries_archived_idx
  on public.inquiries (archived_at)
  where archived_at is null;
