-- Inquiry workflow redesign: vendor inquiries can contain multiple quoted item rows.
create type public.inquiry_status_v2 as enum (
  'Quoted',
  'Pending quotation',
  'Ordered',
  '1st Order Plan',
  'Follow Up',
  'Followed but No Response',
  'Cancel'
);

alter table public.inquiries
  add column if not exists status_reason text,
  add column if not exists follow_up_date date;

alter table public.inquiries
  alter column status drop default;

alter table public.inquiries
  alter column status type public.inquiry_status_v2
  using (
    case status::text
      when 'Pending' then 'Pending quotation'::public.inquiry_status_v2
      when 'Ordered' then 'Ordered'::public.inquiry_status_v2
      when 'Lost' then 'Cancel'::public.inquiry_status_v2
      when 'No Order' then 'Cancel'::public.inquiry_status_v2
      else 'Pending quotation'::public.inquiry_status_v2
    end
  );

drop type public.inquiry_status;
alter type public.inquiry_status_v2 rename to inquiry_status;
alter table public.inquiries alter column status set default 'Pending quotation'::public.inquiry_status;

create table public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  sort_order integer not null default 0,
  brand text,
  rbo_code text,
  quantity numeric,
  price numeric,
  currency text not null default 'USD' check (currency in ('USD', 'VND')),
  incoterm text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inquiry_items_inquiry_id_sort_idx
  on public.inquiry_items (inquiry_id, sort_order);

alter table public.inquiry_items enable row level security;
create policy "Authenticated users can read inquiry items"
  on public.inquiry_items for select to authenticated using (true);
create policy "Authenticated users can insert inquiry items"
  on public.inquiry_items for insert to authenticated with check (true);
create policy "Authenticated users can update inquiry items"
  on public.inquiry_items for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete inquiry items"
  on public.inquiry_items for delete to authenticated using (true);

insert into public.inquiry_items (inquiry_id, sort_order, brand, rbo_code, quantity, price, currency)
select id, 0, brand, item_code, monthly_projection, unit_price_usd, 'USD'
from public.inquiries
where not exists (
  select 1 from public.inquiry_items items where items.inquiry_id = inquiries.id
);

create trigger set_inquiry_items_updated_at
before update on public.inquiry_items
for each row execute function public.set_updated_at();
