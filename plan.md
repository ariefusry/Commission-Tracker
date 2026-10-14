# Commission Tracker — Project Plan

Web app gratis untuk artist (didukung donasi QRIS): melacak open commission gambar (deadline, progress, client, tipe, add-on, pembayaran, pendapatan). Setiap artist punya akun dan data sendiri; aplikasi dipakai setelah login. Fase 2 menambah halaman publik agar client bisa melihat progress pesanannya.

## 1. Tujuan

- Menggantikan catatan manual (spreadsheet/notes) dengan satu dashboard.
- Melihat dengan cepat: berapa commission aktif, berapa pendapatan masuk, berapa yang tertunda.
- Jadi project portofolio fullstack dengan demo live dan studi kasus.

## 2. Scope

### MVP (Fase 1)
1. Auth:
   - daftar, login, logout, lupa password (Supabase Auth, email + password)
   - semua halaman aplikasi wajib login; belum login → redirect ke `/login`
   - data tiap user terpisah (RLS per `user_id`)
   - halaman `/donasi` (QRIS) untuk dukungan sukarela
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
| Donasi | QRIS statis (`public/qris.png`) di halaman `/donasi` |
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
│  └─ layout.tsx
├─ proxy.ts                      # cek login (Next 16: pengganti middleware.ts)
├─ components/
│  ├─ ui/                        # shadcn
│  ├─ commissions/               # form, tabel, badge status
│  └─ dashboard/                 # stat card, chart
├─ lib/
│  ├─ supabase/                  # client dan server helper
│  ├─ pricing.ts                 # hitung harga commission
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
- [x] Halaman daftar, login, logout, lupa password (Supabase Auth)
- [x] Proxy (`proxy.ts`): belum login → `/login`
- [x] Aktifkan RLS per user; uji akses langsung lewat API (user lain dan tanpa login ditolak)
- [x] ~~Halaman `/billing`~~ (dihapus: aplikasi gratis, diganti halaman `/donasi`)
- [x] Akun demo dengan beberapa commission contoh (data fiktif, `supabase/demo/seed.sql`)

### Milestone 2 — CRUD commission (2 hari)
- [x] Halaman daftar commission
- [x] Form tambah/edit dengan validasi Zod
- [x] Pilihan tipe dan add-on, opsi custom
- [x] Harga otomatis di `lib/pricing.ts` + override manual
- [x] Update progress dan status pembayaran dari tabel
- [x] Hapus (dengan konfirmasi)

### Milestone 3 — Dashboard (2 hari)
- [x] Kartu ringkasan
- [x] Tabel interaktif: sort, filter (status, bayar, tipe, rentang tanggal), search username
- [x] Grafik pendapatan per bulan
- [x] Grafik distribusi tipe
- [x] Filter periode (bulan ini, 3 bulan, semua)

### Milestone 4 — Polish MVP (1 hari)
- [x] Responsif di mobile (audit 16 halaman × 390/768/1024/1280px)
- [x] Loading, empty, dan error state
- [x] Indikator deadline
- [x] Halaman pengaturan harga

### Milestone 5 — Halaman publik (Fase 2, 2 hari)
- [x] Kode tracking unik per commission
- [x] Halaman `/track/[code]` read-only (tanpa data sensitif seperti harga dan kontak)
- [x] Posisi antrean client + papan "Sedang dikerjakan" / "Waiting list" (tanpa nama client lain), juga untuk client yang sudah dikerjakan
- [x] Perkiraan tanggal selesai dari kecepatan kerja artist (bisa disembunyikan di Pengaturan)
- [x] Upload gambar WIP ke Supabase Storage (maks. 10/commission, kompres WebP di browser, hapus otomatis 30 hari setelah selesai)
- [x] Progress bar tahap untuk commission lain di halaman tracking client
- [x] Board Waiting list → Sedang dikerjakan → Selesai (tampilan Daftar | Board)
- [x] Drag & drop kartu (urutan prioritas + pindah kolom), dipakai juga untuk urutan antrean client
- [x] Slot: jumlah commission dikerjakan bersamaan, waiting list otomatis saat penuh, tawaran "mulai berikutnya"
- [x] Label status "Waiting list", tahap default pertama "Dikonfirmasi"
- [ ] Tombol buka/tutup commission (`settings.is_open`), ditunda sampai form order publik (Fase 3)

### Milestone 6 — Portofolio (1 hari)
- [ ] README: fitur, screenshot, cara menjalankan
- [ ] Demo live dengan data dummy (jangan pakai data client asli)
- [ ] Studi kasus singkat: masalah, keputusan teknis, hasil
- [ ] Tambahkan ke ariefusry.me

### Milestone 7 — Donasi
- [x] Hapus gerbang langganan/trial (aplikasi gratis)
- [x] Halaman `/donasi` dengan QRIS
- [ ] Pasang gambar QRIS di `public/qris.png`

Estimasi total: sekitar 11-12 hari kerja santai.

## 6. Aturan Bisnis

- **Harga total** = harga dasar tipe + jumlah harga add-on. Jika `price_override` terisi, pakai itu.
- **Sisa bayar** = harga total − DP (jika DP) atau 0 (jika paid).
- **Pendapatan masuk** = jumlah DP untuk status `dp` + harga total untuk status `paid`.
- **Pendapatan tertunda** = harga total − pendapatan masuk, untuk commission yang tidak dibatalkan.
- **Commission dibatalkan** tidak dihitung ke nilai order maupun sisa tagihan. DP/pembayaran yang sudah diterima tetap dihitung sebagai uang masuk jika pengaturan "Hitung DP dari commission yang dibatalkan" aktif (default aktif, Pengaturan → Pembayaran). DP yang dikembalikan: ubah status bayar ke "Belum bayar".
- **Terlambat** jika deadline sudah lewat dan status belum `selesai`.
- Mata uang: rupiah, disimpan sebagai bilangan bulat (tanpa desimal).
- **Akses aplikasi** = sudah login. Aplikasi gratis; dukungan lewat donasi QRIS.

## 7. Keamanan

- Semua tabel aktifkan Row Level Security; user hanya boleh baca/tulis datanya sendiri.
- Isolasi data wajib ditegakkan di RLS, bukan hanya proxy (publishable key bisa dipakai memanggil API langsung).
- Halaman publik hanya mengambil kolom yang aman lewat view atau endpoint khusus.
- Jangan commit `.env.local`. Pakai `NEXT_PUBLIC_` hanya untuk URL dan publishable key Supabase (`sb_publishable_...`); secret key (`sb_secret_...`) hanya di server.
- Kode tracking acak (mis. 8 karakter), bukan ID berurutan.

## 8. Testing

- Unit test `lib/pricing.ts` (kombinasi tipe, add-on, override, DP).
- Cek manual: tambah, edit, hapus, filter, sort, grafik cocok dengan data.
- Uji di layar mobile dan desktop.

## 9. Definisi Selesai (MVP)

- Bisa daftar dan login; tanpa login tidak bisa membuka aplikasi maupun membaca data lewat API.
- User A tidak bisa melihat data user B.
- Bisa tambah, edit, hapus commission dengan semua field.
- Dashboard menampilkan angka yang benar dan bisa disortir/difilter.
- Sudah deploy di Vercel dan bisa diakses dengan data demo.
- README dan screenshot siap.

## 10. Keputusan Tertunda

- Tidak ada.
