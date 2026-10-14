"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { catalogItemSchema, type CatalogItemInput } from "@/lib/validators";

/** type = tipe pesanan, addon = add-on, stage = tahap pengerjaan (tanpa harga). */
export type CatalogKind = "type" | "addon" | "stage";
export type CatalogResult = { id?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> };

const idSchema = z.uuid();
const UNIQUE_VIOLATION = "23505";
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function nextSortOrder(supabase: Supabase, table: "commission_types" | "stages") {
  const { data } = await supabase.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  return (data?.sort_order ?? 0) + 1;
}

export async function saveCatalogItem(kind: CatalogKind, id: string | null, input: CatalogItemInput): Promise<CatalogResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const parsed = catalogItemSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, price, is_active } = parsed.data;

  const supabase = await createClient();
  let res: { error: { code: string } | null; data?: { id: string } | null };

  if (kind === "type") {
    res = id
      ? await supabase.from("commission_types").update({ name, base_price: price, is_active }).eq("id", id)
      : await supabase
          .from("commission_types")
          .insert({ name, base_price: price, is_active, sort_order: await nextSortOrder(supabase, "commission_types") })
          .select("id")
          .single();
  } else if (kind === "stage") {
    res = id
      ? await supabase.from("stages").update({ name, is_active }).eq("id", id)
      : await supabase
          .from("stages")
          .insert({ name, is_active, sort_order: await nextSortOrder(supabase, "stages") })
          .select("id")
          .single();
  } else {
    res = id
      ? await supabase.from("addons").update({ name, price, is_active }).eq("id", id)
      : await supabase.from("addons").insert({ name, price, is_active }).select("id").single();
  }

  if (res.error) {
    if (res.error.code === UNIQUE_VIOLATION) return { fieldErrors: { name: ["Nama sudah dipakai"] } };
    console.error("saveCatalogItem", res.error);
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  refresh();
  return { id: res.data?.id };
}

export async function deleteCatalogItem(kind: CatalogKind, id: string): Promise<CatalogResult> {
  if (!idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const supabase = await createClient();

  // Item yang sudah dipakai commission tidak boleh dihapus (data commission lama bergantung padanya).
  const usage =
    kind === "type"
      ? await supabase.from("commissions").select("id", { count: "exact", head: true }).eq("type_id", id)
      : kind === "stage"
        ? await supabase.from("commissions").select("id", { count: "exact", head: true }).eq("stage_id", id)
        : await supabase.from("commission_addons").select("id", { count: "exact", head: true }).eq("addon_id", id);
  if (usage.error) return { error: "Gagal menghapus. Coba lagi." };
  if (usage.count) {
    return { error: `Dipakai ${usage.count} commission. Nonaktifkan saja agar tidak muncul di form baru.` };
  }

  const { data, error } = await (kind === "type"
    ? supabase.from("commission_types").delete().eq("id", id).select("id")
    : kind === "stage"
      ? supabase.from("stages").delete().eq("id", id).select("id")
      : supabase.from("addons").delete().eq("id", id).select("id"));
  if (error || !data?.length) {
    if (error) console.error("deleteCatalogItem", error);
    return { error: "Gagal menghapus. Coba lagi." };
  }
  refresh();
  return {};
}

/** Tukar urutan tipe/tahap dengan tetangganya. */
export async function moveItem(kind: "type" | "stage", id: string, direction: "up" | "down"): Promise<CatalogResult> {
  if (!idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const table = kind === "type" ? "commission_types" : "stages";
  const supabase = await createClient();
  const { data: rows, error } = await supabase.from(table).select("id, sort_order").order("sort_order").order("name");
  if (error) return { error: "Gagal mengubah urutan." };

  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return {};

  // Normalisasi urutan 1..n lalu tukar, agar nilai sort_order yang sama tidak membuat swap gagal.
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  const results = await Promise.all(
    order.map((rowId, idx) => supabase.from(table).update({ sort_order: idx + 1 }).eq("id", rowId)),
  );
  if (results.some((r) => r.error)) return { error: "Gagal mengubah urutan." };
  refresh();
  return {};
}

const preferencesSchema = z.object({ count_cancelled_paid: z.boolean() });

export async function updatePreferences(input: z.input<typeof preferencesSchema>): Promise<CatalogResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { error: "Data tidak valid." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "Sesi berakhir. Login ulang." };

  const { data, error } = await supabase.from("settings").update(parsed.data).eq("user_id", userId).select("user_id");
  if (error || !data?.length) {
    if (error) console.error("updatePreferences", error);
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  refresh();
  return {};
}
