// Gambar WIP di Supabase Storage. Semua logika path/bucket di sini agar mudah
// dipindah ke layanan lain (mis. Cloudflare R2) tanpa membongkar aplikasi.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const WIP_BUCKET = "wip";
export const WIP_MAX_PER_COMMISSION = 10;
export const WIP_MAX_BYTES = 1024 * 1024; // sama dengan file_size_limit bucket
export const WIP_TYPES = ["image/webp", "image/jpeg"] as const;

/** {user_id}/{commission_id}/{acak}.{ext} — folder pertama wajib milik artist (policy storage). */
export function wipPath(userId: string, commissionId: string, type: (typeof WIP_TYPES)[number]): string {
  return `${userId}/${commissionId}/${crypto.randomUUID()}.${type === "image/webp" ? "webp" : "jpg"}`;
}

/**
 * Hapus file WIP per batch. remove() tidak error bila file tak terhapus (mis. policy), jadi jika
 * jumlahnya kurang, setiap path dicek: file yang memang sudah tidak ada dianggap terhapus.
 * false = ada file yang masih tersisa (atau statusnya tidak pasti) → jangan hapus barisnya.
 */
export async function removeWipFiles(supabase: SupabaseClient<Database>, paths: string[]): Promise<boolean> {
  const bucket = supabase.storage.from(WIP_BUCKET);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const removed = await bucket.remove(batch);
    if (removed.error) {
      console.error("removeWipFiles", removed.error);
      return false;
    }
    if (removed.data.length === batch.length) continue;
    for (const path of batch) {
      try {
        if ((await bucket.exists(path)).data) return false;
      } catch (error) {
        console.error("removeWipFiles exists", error);
        return false;
      }
    }
  }
  return true;
}

/** URL publik (bucket publik; path acak sehingga tidak bisa ditebak). */
export function wipUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${WIP_BUCKET}/${path}`;
}
