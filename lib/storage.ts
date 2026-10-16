// Gambar di Supabase Storage (WIP + foto profil artist). Semua logika path/bucket di sini agar mudah
// dipindah ke layanan lain (mis. Cloudflare R2) tanpa membongkar aplikasi.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const WIP_BUCKET = "wip";
export const WIP_MAX_PER_COMMISSION = 10;
export const WIP_MAX_BYTES = 1024 * 1024; // sama dengan file_size_limit bucket
export const WIP_TYPES = ["image/webp", "image/jpeg"] as const;

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 256 * 1024; // sama dengan file_size_limit bucket
export const AVATAR_TYPES = WIP_TYPES;

type ImageType = (typeof WIP_TYPES)[number];
const ext = (type: ImageType) => (type === "image/webp" ? "webp" : "jpg");

/** {user_id}/{commission_id}/{acak}.{ext} — folder pertama wajib milik artist (policy storage). */
export function wipPath(userId: string, commissionId: string, type: ImageType): string {
  return `${userId}/${commissionId}/${crypto.randomUUID()}.${ext(type)}`;
}

/** {user_id}/{acak}.{ext} — satu tingkat di folder artist (policy storage + check settings.avatar_path). */
export function avatarPath(userId: string, type: ImageType): string {
  return `${userId}/${crypto.randomUUID()}.${ext(type)}`;
}

/**
 * Hapus file per batch. remove() tidak error bila file tak terhapus (mis. policy), jadi jika
 * jumlahnya kurang, setiap path dicek: file yang memang sudah tidak ada dianggap terhapus.
 * false = ada file yang masih tersisa (atau statusnya tidak pasti) → jangan hapus barisnya.
 */
export async function removeFiles(supabase: SupabaseClient<Database>, bucketId: string, paths: string[]): Promise<boolean> {
  const bucket = supabase.storage.from(bucketId);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const removed = await bucket.remove(batch);
    if (removed.error) {
      console.error("removeFiles", bucketId, removed.error);
      return false;
    }
    if (removed.data.length === batch.length) continue;
    for (const path of batch) {
      try {
        if ((await bucket.exists(path)).data) return false;
      } catch (error) {
        console.error("removeFiles exists", bucketId, error);
        return false;
      }
    }
  }
  return true;
}

export const removeWipFiles = (supabase: SupabaseClient<Database>, paths: string[]) => removeFiles(supabase, WIP_BUCKET, paths);

const publicUrl = (bucket: string, path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

/** URL publik (bucket publik; path acak sehingga tidak bisa ditebak). */
export const wipUrl = (path: string) => publicUrl(WIP_BUCKET, path);
export const avatarUrl = (path: string) => publicUrl(AVATAR_BUCKET, path);
