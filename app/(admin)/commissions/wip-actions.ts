"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { WIP_BUCKET, WIP_MAX_BYTES, WIP_MAX_PER_COMMISSION, WIP_TYPES, wipPath } from "@/lib/storage";

export type WipResult = { error?: string };
const idSchema = z.uuid();

/** Upload satu gambar WIP (sudah dikompres di browser) untuk commission milik user. */
export async function uploadWip(formData: FormData): Promise<WipResult> {
  const commissionId = formData.get("commission_id");
  const file = formData.get("file");
  if (!idSchema.safeParse(commissionId).success || !(file instanceof File)) return { error: "Data tidak valid." };
  if (!(WIP_TYPES as readonly string[]).includes(file.type)) return { error: "Format gambar tidak didukung." };
  if (file.size > WIP_MAX_BYTES) return { error: "Gambar terlalu besar (maks. 1 MB setelah dikompres)." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "Sesi berakhir. Login ulang." };

  // Commission milik user (RLS) + tahap saat ini sebagai label gambar.
  const { data: commission } = await supabase
    .from("commissions")
    .select("id, stage_id")
    .eq("id", commissionId as string)
    .maybeSingle();
  if (!commission) return { error: "Commission tidak ditemukan." };

  const { count } = await supabase
    .from("wip_images")
    .select("id", { count: "exact", head: true })
    .eq("commission_id", commission.id);
  if ((count ?? 0) >= WIP_MAX_PER_COMMISSION) return { error: `Maksimal ${WIP_MAX_PER_COMMISSION} gambar WIP per commission.` };

  const path = wipPath(userId, commission.id, file.type as (typeof WIP_TYPES)[number]);
  const upload = await supabase.storage.from(WIP_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) {
    console.error("uploadWip storage", upload.error);
    return { error: "Gagal mengunggah gambar. Coba lagi." };
  }

  const { error } = await supabase
    .from("wip_images")
    .insert({ commission_id: commission.id, stage_id: commission.stage_id, storage_path: path });
  if (error) {
    // Jangan tinggalkan file yatim jika baris gagal (mis. batas 10 tercapai bersamaan).
    await supabase.storage.from(WIP_BUCKET).remove([path]);
    console.error("uploadWip row", error);
    return { error: error.code === "23514" ? `Maksimal ${WIP_MAX_PER_COMMISSION} gambar WIP per commission.` : "Gagal menyimpan gambar." };
  }
  refresh();
  return {};
}

export async function deleteWip(id: string): Promise<WipResult> {
  if (!idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const supabase = await createClient();
  const { data } = await supabase.from("wip_images").select("storage_path").eq("id", id).maybeSingle();
  if (!data) return { error: "Gambar tidak ditemukan." };

  const removed = await supabase.storage.from(WIP_BUCKET).remove([data.storage_path]);
  // remove() tidak error bila file tak terhapus (mis. policy) → cek jumlahnya.
  if (removed.error || removed.data.length < 1) {
    console.error("deleteWip storage", removed.error);
    return { error: "Gagal menghapus gambar." };
  }
  const { error } = await supabase.from("wip_images").delete().eq("id", id);
  if (error) {
    console.error("deleteWip row", error);
    return { error: "Gagal menghapus gambar." };
  }
  refresh();
  return {};
}
