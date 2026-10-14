# Commission Tracker — Project Plan

Web app berlangganan untuk artist: melacak open commission gambar (deadline, progress, client, tipe, add-on, pembayaran, pendapatan). Setiap artist punya akun dan data sendiri; aplikasi hanya bisa dipakai setelah login dan langganan aktif. Fase 2 menambah halaman publik agar client bisa melihat progress pesanannya.

## 1. Tujuan

- Menggantikan catatan manual (spreadsheet/notes) dengan satu dashboard.
- Melihat dengan cepat: berapa commission aktif, berapa pendapatan masuk, berapa yang tertunda.
- Jadi project portofolio fullstack dengan demo live dan studi kasus.

## 2. Scope

### MVP (Fase 1)
1. Auth dan akses berbayar:
   - daftar, login, logout, lupa password (Supabase Auth, email + password)
   - semua halaman aplikasi wajib login; belum login → redirect ke `/login`
   - user baru otomatis dapat trial 7 hari
   - login tapi langganan/trial habis → redirect ke `/billing`
   - pembayaran langganan lewat Midtrans (Milestone 7, ditunda); sebelum itu aktivasi manual di Supabase
   - data tiap user terpisah (RLS per `user_id`)
2. CRUD commission dengan field:
   - tanggal mulai dan deadline
   - progress: sketsa, lineart, coloring, finishing, custom
   - username client (+ kontak dan platform)
   - tipe: headshot, bust up, halfbody, knee up, full body, custom
   - add-on: detailed character, detailed background, custom
   - pembayaran: unpaid, DP, paid (+ nominal DP)
   - harga (otomatis dari tipe + add-on, bisa di-override manual)
3. Dashboard:
   - kartu ringkasan: total commission, total pendapatan, sudah dibayar, belum dibayar, rata-rata harga
   - tabel dengan sort, filter, dan pencarian
   - grafik pendapatan per bulan dan distribusi tipe
4. Pengaturan harga dasar tipe dan add-on.

### Fase 2
- Halaman publik tracking: client memasukkan kode tracking, melihat tahap progress tanpa login.
- Upload gambar WIP (sketsa/lineart) ke halaman tracking.
- Slot open commission: batas antrean dan tombol buka/tutup.
- Indikator deadline (sisa hari, merah jika terlambat), hitungan revisi.

### Fase 3 (opsional)
- Export CSV/PDF (invoice).
- Notifikasi deadline (email/Discord webhook).
- Form order publik untuk client.
- Dark mode, PWA.
- Langganan auto-renew (Midtrans recurring); MVP cukup bayar manual per periode.

### Di luar scope
- Tim/banyak user dalam satu akun, chat antar pengguna, panel super-admin (kelola user lewat dashboard Supabase).

## 3. Tech Stack

| Bagian | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Tabel | TanStack Table |
| Grafik | Recharts |
| Form dan validasi | React Hook Form + Zod |
| Database dan auth | Supabase (Postgres, Auth, Storage) |
| Pembayaran | Midtrans Snap (REST via `fetch`, tanpa SDK) |
| Deploy | Vercel |

## 4. Struktur Folder

```
TrackerCommis/
├─ app/
│  ├─ (admin)/
│  │  ├─ dashboard/page.tsx
│  │  ├─ commissions/page.tsx
│  │  ├─ commissions/[id]/page.tsx
│  │  └─ settings/page.tsx
│  ├─ track/[code]/page.tsx      # Fase 2, publik
│  ├─ login/page.tsx             # publik
│  ├─ signup/page.tsx            # publik
│  ├─ billing/page.tsx           # login, tanpa langganan aktif
│  ├─ api/billing/checkout/route.ts      # buat transaksi Snap
│  ├─ api/midtrans/notification/route.ts # webhook Midtrans
│  └─ layout.tsx
├─ proxy.ts                      # cek login + langganan (Next 16: pengganti middleware.ts)
├─ components/
│  ├─ ui/                        # shadcn
│  ├─ commissions/               # form, tabel, badge status
│  └─ dashboard/                 # stat card, chart
├─ lib/
│  ├─ supabase/                  # client dan server helper
│  ├─ pricing.ts                 # hitung harga commission
│  ├─ billing.ts                 # paket langganan, Midtrans, verifikasi signature
│  ├─ validators.ts              # skema Zod
│  └─ format.ts                  # rupiah, tanggal
├─ types/
├─ supabase/migrations/
├─ plan.md  database.md  CLAUDE.md
└─ README.md
```

## 5. Roadmap Pengerjaan

### Milestone 0 — Setup (0,5 hari)
- [x] Buat project Next.js + TypeScript + Tailwind
- [x] Install shadcn/ui, Recharts, TanStack Table, Zod, React Hook Form
- [x] Buat project Supabase, simpan env di `.env.local`
- [x] Repo GitHub, deploy kosong ke Vercel

### Milestone 1 — Database dan auth (1 hari)
- [x] Jalankan migration dari `database.md`
- [x] Trigger user baru: buat `subscriptions`, `settings`, tipe dan add-on default
- [ ] Halaman daftar, login, logout, lupa password (Supabase Auth)
- [x] Proxy (`proxy.ts`): belum login → `/login`; langganan tidak aktif → `/billing`
- [x] Aktifkan RLS per user + `has_access()`; uji akses langsung lewat API dengan akun tanpa langganan (harus ditolak)
- [ ] Halaman `/billing`: status langganan / sisa hari trial (tombol bayar menyusul di Milestone 7)
- [ ] Akun demo dengan langganan aktif dan beberapa commission contoh (data fiktif)

### Milestone 2 — CRUD commission (2 hari)
- [ ] Halaman daftar commission
- [ ] Form tambah/edit dengan validasi Zod
- [ ] Pilihan tipe dan add-on, opsi custom
- [ ] Harga otomatis di `lib/pricing.ts` + override manual
- [ ] Update progress dan status pembayaran dari tabel
- [ ] Hapus (dengan konfirmasi)

### Milestone 3 — Dashboard (2 hari)
- [ ] Kartu ringkasan
- [ ] Tabel interaktif: sort, filter (status, bayar, tipe, rentang tanggal), search username
- [ ] Grafik pendapatan per bulan
- [ ] Grafik distribusi tipe
- [ ] Filter periode (bulan ini, 3 bulan, semua)

### Milestone 4 — Polish MVP (1 hari)
- [ ] Responsif di mobile
- [ ] Loading, empty, dan error state
- [ ] Indikator deadline
- [ ] Halaman pengaturan harga

### Milestone 5 — Halaman publik (Fase 2, 2 hari)
- [ ] Kode tracking unik per commission
- [ ] Halaman `/track/[code]` read-only (tanpa data sensitif seperti harga dan kontak)
- [ ] Upload gambar WIP ke Supabase Storage
- [ ] Slot open commission

### Milestone 6 — Portofolio (1 hari)
- [ ] README: fitur, screenshot, cara menjalankan
- [ ] Demo live dengan data dummy (jangan pakai data client asli)
- [ ] Studi kasus singkat: masalah, keputusan teknis, hasil
- [ ] Tambahkan ke ariefusry.me

### Milestone 7 — Pembayaran Midtrans (DITUNDA, 1-2 hari)
Dikerjakan paling akhir, setelah Midtrans (atau alternatifnya) siap dipakai. Sampai saat itu: trial 7 hari + aktivasi manual di Supabase. Tabel `payments` dan fungsi `activate_payment` belum di-migrate.
- [ ] Pilih gateway (Midtrans atau alternatif)
- [ ] Migration `payments` + `activate_payment` (lihat `database.md`)
- [ ] Akun Midtrans sandbox; env `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`
- [ ] Tentukan harga dan durasi paket (lihat Keputusan Tertunda)
- [ ] `POST /api/billing/checkout`: buat baris `payments` (pending), panggil Snap API, redirect user ke `redirect_url`
- [ ] `POST /api/midtrans/notification`: verifikasi signature, cocokkan `gross_amount`, panggil `activate_payment`
- [ ] Set Payment Notification URL di dashboard Midtrans
- [ ] Tombol bayar di `/billing`
- [ ] Unit test verifikasi signature dan mapping status
- [ ] Uji end-to-end di sandbox: sukses, pending, expire, notifikasi ganda

Estimasi total: sekitar 11-12 hari kerja santai.

## 6. Aturan Bisnis

- **Harga total** = harga dasar tipe + jumlah harga add-on. Jika `price_override` terisi, pakai itu.
- **Sisa bayar** = harga total − DP (jika DP) atau 0 (jika paid).
- **Pendapatan masuk** = jumlah DP untuk status `dp` + harga total untuk status `paid`.
- **Pendapatan tertunda** = harga total − pendapatan masuk, untuk commission yang tidak dibatalkan.
- **Commission dibatalkan** tidak dihitung ke total pendapatan, kecuali DP yang tidak dikembalikan (dicatat manual).
- **Terlambat** jika deadline sudah lewat dan status belum `selesai`.
- Mata uang: rupiah, disimpan sebagai bilangan bulat (tanpa desimal).
- **Akses aplikasi** = sudah login dan `active_until >= hari ini`. Data lama tidak dihapus saat langganan habis, hanya tidak bisa diakses sampai diperpanjang.
- **Trial** = 7 hari sejak daftar, sekali per akun.
- **Perpanjangan** = `max(active_until, hari ini) + durasi paket`; bayar saat masih aktif tidak menghanguskan sisa hari.
- **Langganan aktif** hanya dari status Midtrans `settlement`, atau `capture` dengan `fraud_status = accept`. `pending` belum memberi akses.

## 7. Keamanan

- Semua tabel aktifkan Row Level Security; user hanya boleh baca/tulis datanya sendiri dan hanya jika langganan aktif (`has_access()`).
- Gerbang berbayar wajib ditegakkan di RLS, bukan hanya middleware (publishable key bisa dipakai memanggil API langsung).
- Tabel `subscriptions` dan `payments` tidak bisa ditulis user; hanya service role (webhook Midtrans / manual).
- Webhook Midtrans wajib verifikasi `signature_key` = SHA512(`order_id` + `status_code` + `gross_amount` + server key) dan `gross_amount` sama dengan `payments.amount`; tolak jika tidak cocok.
- Harga paket ditentukan di server (`lib/billing.ts`), tidak pernah diambil dari input client.
- `MIDTRANS_SERVER_KEY` hanya di server, jangan diberi prefix `NEXT_PUBLIC_`.
- Halaman publik hanya mengambil kolom yang aman lewat view atau endpoint khusus.
- Jangan commit `.env.local`. Pakai `NEXT_PUBLIC_` hanya untuk URL dan publishable key Supabase (`sb_publishable_...`); secret key (`sb_secret_...`) hanya di server.
- Kode tracking acak (mis. 8 karakter), bukan ID berurutan.

## 8. Testing

- Unit test `lib/pricing.ts` (kombinasi tipe, add-on, override, DP).
- Cek manual: tambah, edit, hapus, filter, sort, grafik cocok dengan data.
- Uji di layar mobile dan desktop.

## 9. Definisi Selesai (MVP)

- Bisa daftar dan login; tanpa langganan aktif tidak bisa membuka aplikasi maupun membaca data lewat API.
- User A tidak bisa melihat data user B.
- Bisa tambah, edit, hapus commission dengan semua field.
- Dashboard menampilkan angka yang benar dan bisa disortir/difilter.
- Sudah deploy di Vercel dan bisa diakses dengan data demo.
- README dan screenshot siap.

## 10. Keputusan Tertunda

- **Harga dan durasi paket langganan** — ditentukan setelah fitur MVP selesai, sebelum Milestone 7. Simpan sebagai konstanta di `lib/billing.ts` agar mudah diubah.
