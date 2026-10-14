// Gambar WIP di Supabase Storage. Semua logika path/bucket di sini agar mudah
// dipindah ke layanan lain (mis. Cloudflare R2) tanpa membongkar aplikasi.
export const WIP_BUCKET = "wip";
export const WIP_MAX_PER_COMMISSION = 10;
export const WIP_MAX_BYTES = 1024 * 1024; // sama dengan file_size_limit bucket
export const WIP_TYPES = ["image/webp", "image/jpeg"] as const;

/** {user_id}/{commission_id}/{acak}.{ext} — folder pertama wajib milik artist (policy storage). */
export function wipPath(userId: string, commissionId: string, type: (typeof WIP_TYPES)[number]): string {
  return `${userId}/${commissionId}/${crypto.randomUUID()}.${type === "image/webp" ? "webp" : "jpg"}`;
}

/** URL publik (bucket publik; path acak sehingga tidak bisa ditebak). */
export function wipUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${WIP_BUCKET}/${path}`;
}
