"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { catalogItemSchema, type CatalogItemInput } from "@/lib/validators";

export type CatalogKind = "type" | "addon";
export type CatalogResult = { error?: string; fieldErrors?: Record<string, string[] | undefined> };

const idSchema = z.uuid();
const UNIQUE_VIOLATION = "23505";

export async function saveCatalogItem(kind: CatalogKind, id: string | null, input: CatalogItemInput): Promise<CatalogResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const parsed = catalogItemSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, price, is_active } = parsed.data;

  const supabase = await createClient();
  let error;
  if (kind === "type") {
    if (id) {
      ({ error } = await supabase.from("commission_types").update({ name, base_price: price, is_active }).eq("id", id));
    } else {
      const { data: last } = await supabase
        .from("commission_types")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      ({ error } = await supabase
        .from("commission_types")
        .insert({ name, base_price: price, is_active, sort_order: (last?.sort_order ?? 0) + 1 }));
    }
  } else if (id) {
    ({ error } = await supabase.from("addons").update({ name, price, is_active }).eq("id", id));
  } else {
    ({ error } = await supabase.from("addons").insert({ name, price, is_active }));
  }

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { fieldErrors: { name: ["Nama sudah dipakai"] } };
    console.error("saveCatalogItem", error);
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  refresh();
  return {};
}

export async function deleteCatalogItem(kind: CatalogKind, id: string): Promise<CatalogResult> {
  if (!idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const supabase = await createClient();

  // Item yang sudah dipakai commission tidak boleh dihapus (FK set null melanggar check).
  const usage =
    kind === "type"
      ? await supabase.from("commissions").select("id", { count: "exact", head: true }).eq("type_id", id)
      : await supabase.from("commission_addons").select("id", { count: "exact", head: true }).eq("addon_id", id);
  if (usage.error) return { error: "Gagal menghapus. Coba lagi." };
  if (usage.count) {
    return { error: `Dipakai ${usage.count} commission. Nonaktifkan saja agar tidak muncul di form baru.` };
  }

  const { data, error } = await (kind === "type"
    ? supabase.from("commission_types").delete().eq("id", id).select("id")
    : supabase.from("addons").delete().eq("id", id).select("id"));
  if (error || !data?.length) {
    if (error) console.error("deleteCatalogItem", error);
    return { error: "Gagal menghapus. Coba lagi." };
  }
  refresh();
  return {};
}

/** Tukar urutan tipe dengan tetangganya. */
export async function moveType(id: string, direction: "up" | "down"): Promise<CatalogResult> {
  if (!idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const supabase = await createClient();
  const { data: types, error } = await supabase
    .from("commission_types")
    .select("id, sort_order")
    .order("sort_order")
    .order("name");
  if (error) return { error: "Gagal mengubah urutan." };

  const i = types.findIndex((t) => t.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= types.length) return {};

  // Normalisasi urutan 1..n lalu tukar, agar nilai sort_order yang sama tidak membuat swap gagal.
  const order = types.map((t) => t.id);
  [order[i], order[j]] = [order[j], order[i]];
  const results = await Promise.all(
    order.map((typeId, idx) => supabase.from("commission_types").update({ sort_order: idx + 1 }).eq("id", typeId)),
  );
  if (results.some((r) => r.error)) return { error: "Gagal mengubah urutan." };
  refresh();
  return {};
}
