"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { actionDict } from "@/lib/i18n/action";
import { createClient } from "@/lib/supabase/server";
import { WIP_BUCKET, WIP_MAX_BYTES, WIP_MAX_PER_COMMISSION, WIP_TYPES, wipPath } from "@/lib/storage";

export type WipResult = { error?: string };
const idSchema = z.uuid();

/** Upload satu gambar WIP (sudah dikompres di browser) untuk commission milik user. */
export async function uploadWip(formData: FormData): Promise<WipResult> {
  const t = await actionDict();
  const commissionId = formData.get("commission_id");
  const file = formData.get("file");
  if (!idSchema.safeParse(commissionId).success || !(file instanceof File)) return { error: t.actions.invalidData };
  if (!(WIP_TYPES as readonly string[]).includes(file.type)) return { error: t.actions.imageFormat };
  if (file.size > WIP_MAX_BYTES) return { error: t.actions.imageTooBig };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: t.actions.sessionExpired };

  // Commission milik user (RLS) + tahap saat ini sebagai label gambar.
  const { data: commission } = await supabase
    .from("commissions")
    .select("id, stage_id")
    .eq("id", commissionId as string)
    .maybeSingle();
  if (!commission) return { error: t.actions.commissionNotFound };

  const { count } = await supabase
    .from("wip_images")
    .select("id", { count: "exact", head: true })
    .eq("commission_id", commission.id);
  if ((count ?? 0) >= WIP_MAX_PER_COMMISSION) return { error: t.actions.imageLimit(WIP_MAX_PER_COMMISSION) };

  const path = wipPath(userId, commission.id, file.type as (typeof WIP_TYPES)[number]);
  const upload = await supabase.storage.from(WIP_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) {
    console.error("uploadWip storage", upload.error);
    return { error: t.actions.uploadFailed };
  }

  const { error } = await supabase
    .from("wip_images")
    .insert({ commission_id: commission.id, stage_id: commission.stage_id, storage_path: path });
  if (error) {
    // Jangan tinggalkan file yatim jika baris gagal (mis. batas 10 tercapai bersamaan).
    await supabase.storage.from(WIP_BUCKET).remove([path]);
    console.error("uploadWip row", error);
    return { error: error.code === "23514" ? t.actions.imageLimit(WIP_MAX_PER_COMMISSION) : t.actions.imageSaveFailed };
  }
  refresh();
  return {};
}

export async function deleteWip(id: string): Promise<WipResult> {
  const t = await actionDict();
  if (!idSchema.safeParse(id).success) return { error: t.actions.invalidId };
  const supabase = await createClient();
  const { data } = await supabase.from("wip_images").select("storage_path").eq("id", id).maybeSingle();
  if (!data) return { error: t.actions.imageNotFound };

  const removed = await supabase.storage.from(WIP_BUCKET).remove([data.storage_path]);
  // remove() tidak error bila file tak terhapus (mis. policy) → cek jumlahnya.
  if (removed.error || removed.data.length < 1) {
    console.error("deleteWip storage", removed.error);
    return { error: t.actions.imageDeleteFailed };
  }
  const { error } = await supabase.from("wip_images").delete().eq("id", id);
  if (error) {
    console.error("deleteWip row", error);
    return { error: t.actions.imageDeleteFailed };
  }
  refresh();
  return {};
}
