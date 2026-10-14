# Commission Tracker

Web app berlangganan untuk artist melacak open commission gambar. Multi-user, wajib login + langganan aktif. Baca `plan.md` untuk scope dan roadmap, `database.md` untuk skema.

## Stack
Next.js (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Table, Recharts, React Hook Form + Zod, Supabase.

## Perintah
- `npm run dev` — jalankan lokal
- `npm run build` — build produksi
- `npm run lint` — lint
- `npm test` — unit test (fokus `lib/pricing.ts` dan `lib/billing.ts`)
- Tipe DB: `types/database.ts` hasil generate, jangan diedit manual (lihat `database.md` → Tooling)

## Aturan Kode
- Next.js 16 (banyak breaking change): baca `AGENTS.md` dan `node_modules/next/dist/docs/` sebelum menulis kode Next.
- TypeScript strict, hindari `any`.
- Validasi semua input form dengan Zod (`lib/validators.ts`), skema yang sama dipakai di client dan server.
- Logika harga hanya di `lib/pricing.ts`; jangan hitung harga di komponen.
- Uang = integer rupiah. Format tampilan lewat `lib/format.ts`.
- Komponen kecil dan fokus; komponen shadcn tetap di `components/ui`.
- Akses database lewat helper di `lib/supabase`, jangan buat client baru di komponen.

## Aturan Bisnis Penting
- Harga total = harga tipe + add-on, kecuali `price_override` terisi.
- Pendapatan masuk = `paid` → harga total, `dp` → `dp_amount`.
- Commission `cancelled` tidak masuk nilai order maupun sisa tagihan. Uang yang sudah diterima darinya (DP tidak dikembalikan) masuk "sudah dibayar" jika preferensi user `settings.count_cancelled_paid` aktif (default aktif). Logika di `lib/stats.ts`.
- Terlambat = deadline lewat dan status belum `done`.

## Keamanan
- RLS aktif di semua tabel; jangan matikan. Policy = pemilik (`user_id = auth.uid()`) + `has_access()`.
- Semua route kecuali `/login`, `/signup`, `/track/[code]` wajib login; `/billing` untuk yang langganannya tidak aktif. `proxy.ts` (Next 16, pengganti middleware) hanya untuk UX, gerbang sebenarnya di RLS.
- `subscriptions` dan `payments` hanya ditulis service role; jangan pakai secret key (`SUPABASE_SECRET_KEY`) di kode client.
- Midtrans: logika di `lib/billing.ts`. Harga paket hanya dari server. Webhook wajib verifikasi `signature_key` + `gross_amount`, lalu panggil `activate_payment` (idempoten). Akses hanya dari `settlement` / `capture`+`accept`.
- `MIDTRANS_SERVER_KEY` hanya di server.
- Halaman publik hanya boleh baca lewat view `public_tracking`.
- Jangan commit `.env.local` atau secret key.

## Cara Kerja
- Kerjakan per milestone sesuai `plan.md`; centang item yang selesai.
- Satu perubahan fokus per commit, pesan commit singkat (mis. `feat: add commission form`).
- Sebelum menandai selesai: jalankan lint dan test, cek di mobile dan desktop.
- Jangan tambah dependency baru tanpa alasan jelas.
- Data demo hanya data fiktif, bukan data client asli.
