# Database Schema (Supabase / PostgreSQL)

Semua uang disimpan sebagai integer rupiah. Tanggal langganan memakai WIB (`Asia/Jakarta`).

**Sumber kebenaran skema = `supabase/migrations/`.** File ini ringkasan; migration berisi detail tambahan (constraint, grant, `tracking_code` acak otomatis).

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
  base_price integer not null default 0,        -- snapshot harga tipe saat dipesan
  price_total integer not null default 0,       -- hasil hitung lib/pricing.ts, disimpan agar mudah di-query

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
    where user_id = auth.uid()
      and active_until >= (now() at time zone 'Asia/Jakarta')::date
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

Halaman publik tracking memakai fungsi `get_tracking(code)` (`security definer`, migration `20261015060000`): hanya mengembalikan satu commission untuk kode 8 karakter hex yang tepat, berisi nama artist (`settings.display_name`), username client, tipe, status, tanggal, dan daftar tahap. Tanpa harga, pembayaran, kontak, atau catatan. Tidak memeriksa langganan, jadi link client tetap jalan walau langganan artist habis. `anon` tidak punya akses ke tabel/view mana pun (view bisa dipakai untuk mendaftar semua kode).

## User Baru (pengganti seed global)

Saat user mendaftar, buat baris langganan, settings, dan harga default miliknya.

```sql
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (user_id, active_until)
    values (new.id, (now() at time zone 'Asia/Jakarta')::date + 6);  -- trial 7 hari termasuk hari daftar
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

## Simpan Commission

`save_commission(p_data jsonb, p_addons jsonb, p_id uuid default null)` menyimpan commission + add-on dalam satu transaksi (`p_id` null = buat baru). `security invoker`, jadi RLS tetap berlaku. Harga dihitung di aplikasi (`lib/pricing.ts`), fungsi hanya menulis.

Snapshot harga: `commissions.base_price` dan `commission_addons.price` diambil dari price list saat dipesan. Edit commission memakai snapshot lama kecuali tipe/add-on diganti.

## Tooling

- Regenerate tipe setelah migration: `npx supabase@2.121.0 gen types typescript --db-url "$SUPABASE_DB_URL" --schema public > types/database.ts` (CLI lama butuh Docker).
- Tes SQL di `supabase/tests/*.sql` berjalan dalam transaksi yang di-rollback; tidak meninggalkan data.

## Tahap per User

Tahap pengerjaan disimpan di tabel `stages` (per user: `name`, `sort_order`, `is_active`), sama seperti tipe pesanan. `commissions.stage_id` (wajib) menunjuk ke tahap; tahap yang dipakai tidak bisa dihapus (`on delete restrict`), cukup dinonaktifkan. User baru mendapat 5 tahap default: Dikonfirmasi, Sketsa, Lineart, Coloring, Finishing (sebelum migration `20261015100000` tahap pertama bernama Antrean).

Kolom lama `commissions.stage` (enum), `stage_custom`, dan enum `commission_stage` sudah dihapus (migration `20261015040000`). `wip_images` juga memakai `stage_id`.

## Preferensi User

`settings.count_cancelled_paid` (default `true`): pembayaran dari commission batal (DP yang tidak dikembalikan) dihitung sebagai uang masuk di dashboard. Diubah di Pengaturan → Pembayaran.

## Antrean & Perkiraan Selesai (halaman tracking)

- `commissions.completed_at`: diisi trigger saat status menjadi `done`, dikosongkan jika dibuka lagi. Data lama diisi dari `deadline` (tanggal selesai asli tidak tercatat).
- Antrean artist = commission berstatus `queue`/`in_progress`/`revision`, urut `start_date` (pesan duluan dikerjakan duluan).
- `get_tracking` mengembalikan `queue_position` (urutan keseluruhan), `wait_position`/`wait_total` (urutan di antrean tunggu, status `queue`), `queue` (papan: posisi, tahap, status, penanda "kamu"; **tanpa nama/kode client lain**), dan `recent_completions` (10 tanggal selesai terakhir).
- Perkiraan selesai dihitung di `lib/queue.ts`: hari per commission = rentang sejak selesai tertua (≤90 hari) ÷ jumlah selesai; minimal 3 data; ditampilkan sebagai rentang ±25%.
- `settings.show_queue` (default `true`): artist bisa menyembunyikan antrean & perkiraan dari client.

## Slot

`settings.slot_limit` (default 5, diatur di Pengaturan → Umum): jumlah commission yang dikerjakan bersamaan (status `in_progress`/`revision`). Commission baru otomatis `queue` (Waiting list) jika slot penuh. `get_tracking` mengembalikan `slot_limit` agar client melihat "Slot artist X/Y terisi".

## Prioritas Manual (drag & drop)

`commissions.queue_order` (double, wajib): urutan prioritas per artist, diatur dengan menggeser kartu di board. Nilai awal mengikuti tanggal pesan (jarak 1000); commission baru otomatis di paling bawah (trigger `set_queue_order`); sisipan memakai nilai tengah dua tetangga (`lib/queue-order.ts`). Antrean di `get_tracking` diurutkan `queue_order`, lalu tanggal pesan, jadi posisi client dan perkiraan selesai mengikuti prioritas artist.

## Aplikasi Gratis (migration `20261015120000`)

Aplikasi tidak berbayar (didukung donasi QRIS). `has_access()` kini hanya `auth.uid() is not null`; semua policy tetap `user_id = auth.uid()`. Tabel `subscriptions` dan trigger trial dibiarkan (tidak dipakai aplikasi); bagian dokumen di atas tentang langganan, Midtrans, `payments`, dan `activate_payment` hanya sebagai riwayat dan tidak dibuat.

## Gambar WIP (migration `20261015130000`, `20261015140000`)

- Bucket Storage publik `wip` (≤ 1 MB, WebP/JPEG). Path `{user_id}/{commission_id}/{uuid}.webp`; policy storage: artist hanya boleh insert/select/delete di folder `{user_id}` miliknya. **Select wajib ada**: tanpa itu `remove()` tidak menghapus apa pun dan tidak error.
- Tabel `wip_images` (`commission_id`, `stage_id`, `storage_path`): policy pemilik + path harus di folder milik artist; trigger membatasi maks. 10 per commission.
- `get_tracking` mengembalikan `wip` (path, nama tahap, waktu; terbaru dulu). URL publik dibangun di `lib/storage.ts`.
- Hapus commission/gambar: file di Storage dihapus lebih dulu (cascade hanya menghapus baris).
- Pembersihan: Vercel Cron harian `/api/cron/cleanup-wip` (dilindungi `CRON_SECRET`, memakai `SUPABASE_SECRET_KEY` di server) menghapus WIP dari commission yang selesai > 30 hari.

## Hapus Akun

`delete_own_account()` (`security definer`, migration `20261015150000`, hanya role `authenticated`) menghapus commission milik `auth.uid()` lebih dulu, lalu baris `auth.users`; tabel lain ikut terhapus lewat `on delete cascade`. Urutan ini perlu karena `stages` dilindungi `on delete restrict` dari `commissions` dan `wip_images`. File WIP di Storage tidak ikut cascade: server action `deleteAccount` menghapusnya lewat Storage API sebelum memanggil fungsi ini dan mengecek jumlah file terhapus. Tes: `supabase/tests/delete_account.sql`.
