-- Milestone 1: skema awal (multi-user, trial, RLS).
-- payments + activate_payment menyusul di Milestone 7.

-- Enum
create type commission_stage as enum ('queue', 'sketch', 'lineart', 'coloring', 'finishing', 'custom');
create type commission_status as enum ('queue', 'in_progress', 'revision', 'done', 'cancelled');
create type payment_status as enum ('unpaid', 'dp', 'paid');

-- Tabel
create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_until date,
  updated_at timestamptz not null default now()
);

create table commission_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  base_price integer not null default 0 check (base_price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (user_id, name)
);

create table addons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  price integer not null default 0 check (price >= 0),
  is_active boolean not null default true,
  unique (user_id, name)
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tracking_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  client_username text not null,
  contact_platform text,
  contact_handle text,

  type_id uuid references commission_types(id) on delete set null,
  type_custom text,

  start_date date not null default current_date,
  deadline date,

  stage commission_stage not null default 'queue',
  stage_custom text,
  status commission_status not null default 'queue',
  revision_count integer not null default 0 check (revision_count >= 0),

  payment_status payment_status not null default 'unpaid',
  dp_amount integer not null default 0,
  price_override integer check (price_override >= 0),
  price_total integer not null default 0,

  reference_links text[] not null default '{}',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (deadline is null or deadline >= start_date),
  check (dp_amount >= 0 and price_total >= 0),
  check (dp_amount <= price_total),
  check (type_id is not null or type_custom is not null),
  check (stage <> 'custom' or stage_custom is not null)
);

create table commission_addons (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references commissions(id) on delete cascade,
  addon_id uuid references addons(id) on delete set null,
  custom_name text,
  price integer not null default 0 check (price >= 0),
  check (addon_id is not null or custom_name is not null)
);

create table settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  is_open boolean not null default true,
  slot_limit integer not null default 5 check (slot_limit >= 0)
);

create table wip_images (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references commissions(id) on delete cascade,
  stage commission_stage not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Index
create index on commissions (user_id);
create index on commissions (status);
create index on commissions (payment_status);
create index on commissions (deadline);
create index on commissions (start_date);
create index on commission_addons (commission_id);
create index on wip_images (commission_id);

-- updated_at
create or replace function set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger commissions_updated_at
before update on commissions
for each row execute function set_updated_at();

-- RLS
alter table subscriptions enable row level security;
alter table commission_types enable row level security;
alter table addons enable row level security;
alter table commissions enable row level security;
alter table commission_addons enable row level security;
alter table settings enable row level security;
alter table wip_images enable row level security;

create or replace function has_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and active_until >= (now() at time zone 'Asia/Jakarta')::date
  );
$$;

create policy "read own" on subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "owner with access" on commission_types
  for all to authenticated
  using (user_id = (select auth.uid()) and (select has_access()))
  with check (user_id = (select auth.uid()) and (select has_access()));

create policy "owner with access" on addons
  for all to authenticated
  using (user_id = (select auth.uid()) and (select has_access()))
  with check (user_id = (select auth.uid()) and (select has_access()));

create policy "owner with access" on commissions
  for all to authenticated
  using (user_id = (select auth.uid()) and (select has_access()))
  with check (user_id = (select auth.uid()) and (select has_access()));

create policy "owner with access" on settings
  for all to authenticated
  using (user_id = (select auth.uid()) and (select has_access()))
  with check (user_id = (select auth.uid()) and (select has_access()));

create policy "owner with access" on commission_addons
  for all to authenticated
  using (exists (select 1 from commissions c
                 where c.id = commission_id and c.user_id = (select auth.uid()))
         and (select has_access()))
  with check (exists (select 1 from commissions c
                      where c.id = commission_id and c.user_id = (select auth.uid()))
              and (select has_access()));

create policy "owner with access" on wip_images
  for all to authenticated
  using (exists (select 1 from commissions c
                 where c.id = commission_id and c.user_id = (select auth.uid()))
         and (select has_access()))
  with check (exists (select 1 from commissions c
                      where c.id = commission_id and c.user_id = (select auth.uid()))
              and (select has_access()));

-- Grant eksplisit: anon tidak boleh akses tabel apa pun.
revoke all on subscriptions, commission_types, addons, commissions,
  commission_addons, settings, wip_images from anon;
grant select on subscriptions to authenticated;
revoke insert, update, delete on subscriptions from authenticated;
grant select, insert, update, delete on commission_types, addons, commissions,
  commission_addons, settings, wip_images to authenticated;

-- User baru: trial 7 hari, settings, harga default.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.subscriptions (user_id, active_until) values (new.id, (now() at time zone 'Asia/Jakarta')::date + 6);  -- trial 7 hari termasuk hari daftar
  insert into public.settings (user_id) values (new.id);
  insert into public.commission_types (user_id, name, base_price, sort_order) values
    (new.id, 'Headshot', 50000, 1),
    (new.id, 'Bust up', 75000, 2),
    (new.id, 'Halfbody', 100000, 3),
    (new.id, 'Knee up', 125000, 4),
    (new.id, 'Full body', 150000, 5);
  insert into public.addons (user_id, name, price) values
    (new.id, 'Detailed character', 25000),
    (new.id, 'Detailed background', 50000);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

revoke execute on function handle_new_user() from public, anon, authenticated;
