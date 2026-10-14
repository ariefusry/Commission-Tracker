# Database Schema (Supabase / PostgreSQL)

Semua uang disimpan sebagai integer rupiah.

Multi-user: setiap user (artist) hanya melihat datanya sendiri. Akses aplikasi butuh login **dan** langganan aktif (`subscriptions.active_until >= hari ini`). Aturan ini ditegakkan di RLS, bukan hanya di middleware, karena publishable key bersifat publik dan bisa dipakai memanggil API Supabase langsung.

## Enum

```sql
create type commission_stage as enum ('queue', 'sketch', 'lineart', 'coloring', 'finishing', 'custom');
create type commission_status as enum ('queue', 'in_progress', 'revision', 'done', 'cancelled');
create type payment_status as enum ('unpaid', 'dp', 'paid');
```

## Tabel

```sql
-- Langganan per user. User hanya boleh membaca; penulisan hanya lewat
-- service role (webhook Midtrans, atau manual di dashboard Supabase).
create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_until date,                  -- diisi trial 7 hari saat daftar
  updated_at timestamptz not null default now()
);

-- Riwayat transaksi Midtrans. Baris dibuat server saat checkout,
-- status diubah oleh webhook. Hanya service role yang menulis.
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,      -- dikirim ke Midtrans
  amount integer not null,            -- rupiah, harus sama dengan gross_amount di webhook
  days integer not null,              -- lama perpanjangan, mis. 30
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  raw jsonb,                          -- notifikasi terakhir dari Midtrans
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table commission_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,                 -- Headshot, Bust up, Halfbody, Knee up, Full body
  base_price integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (user_id, name)
);

create table addons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,                 -- Detailed character, Detailed background
  price integer not null default 0,
  is_active boolean not null default true,
  unique (user_id, name)
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tracking_code text not null unique,           -- untuk halaman publik (Fase 2)
  client_username text not null,
  contact_platform text,                        -- twitter, discord, instagram, dll
  contact_handle text,

  type_id uuid references commission_types(id),
  type_custom text,                             -- diisi jika tipe custom

  start_date date not null default current_date,
  deadline date,

  stage commission_stage not null default 'queue',
  stage_custom text,                            -- diisi jika stage custom
  status commission_status not null default 'queue',
  revision_count integer not null default 0,

  payment_status payment_status not null default 'unpaid',
  dp_amount integer not null default 0,
  price_override integer,                       -- null = pakai harga otomatis
  price_total integer not null default 0,       -- hasil hitung, disimpan agar mudah di-query

  reference_links text[] default '{}',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (deadline is null or deadline >= start_date),
  check (dp_amount >= 0 and price_total >= 0)
);

create table commission_addons (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references commissions(id) on delete cascade,
  addon_id uuid references addons(id),
  custom_name text,                             -- diisi jika add-on custom
  price integer not null default 0,             -- snapshot harga saat dipesan
  check (addon_id is not null or custom_name is not null)
);

create table settings (                         -- satu baris per user
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  is_open boolean not null default true,
  slot_limit integer not null default 5
);

create table wip_images (                       -- Fase 2
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references commissions(id) on delete cascade,
  stage commission_stage not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
```

## Index

```sql
create index on commissions (user_id);
create index on commissions (status);
create index on commissions (payment_status);
create index on commissions (deadline);
create index on commissions (start_date);
create index on commission_addons (commission_id);
create index on payments (user_id);
```

## Trigger updated_at

```sql
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger commissions_updated_at
before update on commissions
for each row execute function set_updated_at();
```

## Row Level Security

```sql
alter table subscriptions enable row level security;
alter table payments enable row level security;
alter table commission_types enable row level security;
alter table addons enable row level security;
alter table commissions enable row level security;
alter table commission_addons enable row level security;
alter table settings enable row level security;
alter table wip_images enable row level security;

-- true jika user yang login punya langganan aktif.
create or replace function has_access() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = auth.uid() and active_until >= current_date
  );
$$;

-- Langganan & pembayaran: user hanya baca miliknya, tidak ada policy tulis.
create policy "read own" on subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "read own" on payments
  for select to authenticated using (user_id = auth.uid());

-- Tabel milik user: pemilik + langganan aktif.
-- Ulangi untuk commission_types, addons, settings.
create policy "owner with access" on commissions
  for all to authenticated
  using (user_id = auth.uid() and has_access())
  with check (user_id = auth.uid() and has_access());

-- Tabel anak: lewat kepemilikan commission. Ulangi untuk wip_images.
create policy "owner with access" on commission_addons
  for all to authenticated
  using (exists (select 1 from commissions c
                 where c.id = commission_id and c.user_id = auth.uid()) and has_access())
  with check (exists (select 1 from commissions c
                      where c.id = commission_id and c.user_id = auth.uid()) and has_access());
```

Pendaftaran publik di Supabase Auth **aktif** (email + password, dengan konfirmasi email). User baru langsung dapat trial 7 hari; setelah itu harus bayar lewat Midtrans.

Fase 2: buat view `public_tracking` yang hanya mengekspos `tracking_code`, `client_username`, `stage`, `status`, `deadline`, lalu beri akses `anon` hanya ke view tersebut (jangan ke tabel `commissions`).

## User Baru (pengganti seed global)

Saat user mendaftar, buat baris langganan, settings, dan harga default miliknya.

```sql
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (user_id, active_until) values (new.id, current_date + 7);  -- trial
  insert into settings (user_id) values (new.id);
  insert into commission_types (user_id, name, base_price, sort_order) values
    (new.id, 'Headshot', 50000, 1),
    (new.id, 'Bust up', 75000, 2),
    (new.id, 'Halfbody', 100000, 3),
    (new.id, 'Knee up', 125000, 4),
    (new.id, 'Full body', 150000, 5);
  insert into addons (user_id, name, price) values
    (new.id, 'Detailed character', 25000),
    (new.id, 'Detailed background', 50000);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
```

Harga di atas hanya default, user mengubahnya di halaman pengaturan.

## Aktivasi Pembayaran

Dipanggil webhook Midtrans (service role) setelah signature valid dan status `settlement` / `capture`+`accept`. Idempoten: notifikasi ganda tidak memperpanjang dua kali. Perpanjangan dihitung dari sisa langganan, bukan dari hari ini, agar sisa hari tidak hangus.

```sql
create or replace function activate_payment(p_order_id text, p_raw jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare p payments;
begin
  update payments set status = 'paid', paid_at = now(), raw = p_raw
  where order_id = p_order_id and status <> 'paid'
  returning * into p;

  if p.id is null then return; end if;   -- sudah diproses / tidak ada

  update subscriptions
  set active_until = greatest(coalesce(active_until, current_date), current_date) + p.days,
      updated_at = now()
  where user_id = p.user_id;
end;
$$;

revoke execute on function activate_payment from public, anon, authenticated;
```

Aktivasi manual (darurat, mis. transfer di luar Midtrans):

```sql
update subscriptions set active_until = current_date + 30, updated_at = now()
where user_id = '<uuid user>';
```

## Query Dashboard (contoh)

Query di bawah otomatis terbatas ke data user yang login karena RLS.

```sql
-- Pendapatan masuk
select coalesce(sum(
  case payment_status
    when 'paid' then price_total
    when 'dp' then dp_amount
    else 0 end), 0) as income_received
from commissions
where status <> 'cancelled';

-- Pendapatan per bulan
select date_trunc('month', start_date) as month,
       sum(price_total) as total
from commissions
where status <> 'cancelled'
group by 1 order by 1;

-- Distribusi tipe
select coalesce(t.name, c.type_custom, 'Custom') as type, count(*)
from commissions c left join commission_types t on t.id = c.type_id
group by 1;
```
