"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CUSTOM_TYPE } from "@/lib/commission";
import { priceTotal } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import {
  commissionSchema,
  parseLinks,
  quickUpdateSchema,
  type CommissionInput,
  type QuickUpdate,
} from "@/lib/validators";

export type ActionResult = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const idSchema = z.uuid();
const GENERIC_ERROR = "Gagal menyimpan. Coba lagi.";

export async function saveCommission(id: string | null, input: CommissionInput): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const parsed = commissionSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;

  const supabase = await createClient();

  // Snapshot harga lama: edit tidak boleh ikut berubah karena price list berubah.
  let existing: { type_id: string | null; base_price: number; addons: { addon_id: string | null; price: number }[] } | null =
    null;
  if (id) {
    const { data } = await supabase
      .from("commissions")
      .select("type_id, base_price, commission_addons(addon_id, price)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { error: "Commission tidak ditemukan." };
    existing = { type_id: data.type_id, base_price: data.base_price, addons: data.commission_addons };
  }

  // FK tidak memeriksa kepemilikan: pastikan tahap milik user (RLS).
  const { data: stage } = await supabase.from("stages").select("id").eq("id", v.stage_id).maybeSingle();
  if (!stage) return { fieldErrors: { stage_id: ["Tahap tidak ditemukan"] } };

  const typeId = v.type_id === CUSTOM_TYPE ? null : v.type_id;
  let basePrice = 0;
  if (typeId) {
    if (existing?.type_id === typeId) {
      basePrice = existing.base_price;
    } else {
      const { data } = await supabase.from("commission_types").select("base_price").eq("id", typeId).maybeSingle();
      if (!data) return { fieldErrors: { type_id: ["Tipe tidak ditemukan"] } };
      basePrice = data.base_price;
    }
  }

  const addonIds = [...new Set(v.addon_ids)];
  const addonPrice = new Map<string, number>();
  existing?.addons.forEach((a) => a.addon_id && addonPrice.set(a.addon_id, a.price));
  const missing = addonIds.filter((a) => !addonPrice.has(a));
  if (missing.length) {
    const { data } = await supabase.from("addons").select("id, price").in("id", missing);
    data?.forEach((a) => addonPrice.set(a.id, a.price));
    if ((data?.length ?? 0) !== missing.length) return { fieldErrors: { addon_ids: ["Add-on tidak ditemukan"] } };
  }

  const addons = [
    ...addonIds.map((a) => ({ addon_id: a, custom_name: null, price: addonPrice.get(a)! })),
    ...v.custom_addons.map((a) => ({ addon_id: null, custom_name: a.name, price: a.price })),
  ];
  const total = priceTotal({ basePrice, addonPrices: addons.map((a) => a.price), override: v.price_override });
  // DP hanya disimpan untuk status dp; paid → pendapatan = total.
  const dpAmount = v.payment_status === "dp" ? v.dp_amount : 0;
  if (dpAmount > total) return { fieldErrors: { dp_amount: ["DP melebihi harga total"] } };

  const { error } = await supabase.rpc("save_commission", {
    p_id: id ?? undefined,
    p_addons: addons,
    p_data: {
      client_username: v.client_username,
      contact_platform: v.contact_platform || null,
      contact_handle: v.contact_handle || null,
      type_id: typeId,
      type_custom: typeId ? null : v.type_custom,
      start_date: v.start_date,
      deadline: v.deadline || null,
      stage_id: v.stage_id,
      status: v.status,
      revision_count: v.revision_count,
      payment_status: v.payment_status,
      dp_amount: dpAmount,
      base_price: basePrice,
      price_override: v.price_override,
      price_total: total,
      reference_links: parseLinks(v.reference_links),
      notes: v.notes || null,
    },
  });
  if (error) {
    console.error("save_commission", error);
    return { error: GENERIC_ERROR };
  }
  redirect("/commissions");
}

export async function quickUpdate(id: string, update: QuickUpdate): Promise<ActionResult> {
  const parsed = quickUpdateSchema.safeParse(update);
  if (!idSchema.safeParse(id).success || !parsed.success) return { error: "Data tidak valid." };
  const u = parsed.data;

  if (u.field === "payment_status" && u.value === "dp") return { error: "Isi nominal DP lewat tombol Edit." };

  const patch =
    u.field === "payment_status"
      ? { payment_status: u.value, dp_amount: 0 }
      : u.field === "stage_id"
        ? { stage_id: u.value }
        : { status: u.value };

  const supabase = await createClient();
  const { data, error } = await supabase.from("commissions").update(patch).eq("id", id).select("id");
  if (error || !data?.length) {
    if (error) console.error("quickUpdate", error);
    return { error: GENERIC_ERROR };
  }
  refresh();
  return {};
}

export async function deleteCommission(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { error: "ID tidak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("commissions").delete().eq("id", id).select("id");
  if (error || !data?.length) {
    if (error) console.error("deleteCommission", error);
    return { error: "Gagal menghapus. Coba lagi." };
  }
  refresh();
  return {};
}
