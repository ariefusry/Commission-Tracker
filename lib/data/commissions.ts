import "server-only";
import type { AddonOption, PriceSnapshot, TypeOption } from "@/components/commissions/commission-form";
import type { CommissionRow } from "@/components/commissions/commission-list";
import { CUSTOM_TYPE, type StageOption } from "@/lib/commission";
import { createClient } from "@/lib/supabase/server";
import type { CommissionInput } from "@/lib/validators";

// Query commission (server). RLS membatasi ke data user yang login.

export async function getCommissionRows(): Promise<CommissionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commissions")
    .select(
      "id, client_username, type_custom, start_date, deadline, stage_id, status, payment_status, dp_amount, price_total, commission_types(name)",
    )
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map(({ commission_types, type_custom, ...c }) => ({
    ...c,
    type_name: commission_types?.name ?? type_custom ?? "Custom",
  }));
}

/** Semua tahap user (termasuk nonaktif; komponen yang menyaring). */
export async function getStages(): Promise<StageOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stages").select("id, name, is_active").order("sort_order").order("name");
  if (error) throw error;
  return data;
}

export async function getFormOptions(include?: { typeId: string | null; addonIds: string[] }) {
  const supabase = await createClient();
  const [types, addons, stages] = await Promise.all([
    supabase.from("commission_types").select("id, name, base_price, is_active").order("sort_order"),
    supabase.from("addons").select("id, name, price, is_active").order("name"),
    getStages(),
  ]);
  if (types.error) throw types.error;
  if (addons.error) throw addons.error;

  // Tipe/add-on nonaktif tetap tampil jika sudah dipakai commission yang diedit.
  const typeOptions: TypeOption[] = types.data
    .filter((t) => t.is_active || t.id === include?.typeId)
    .map(({ id, name, base_price }) => ({ id, name, base_price }));
  const addonOptions: AddonOption[] = addons.data
    .filter((a) => a.is_active || include?.addonIds.includes(a.id))
    .map(({ id, name, price }) => ({ id, name, price }));
  return { types: typeOptions, addons: addonOptions, stages };
}

export const newCommissionDefaults = (): CommissionInput => ({
  client_username: "",
  contact_platform: "",
  contact_handle: "",
  type_id: "",
  type_custom: "",
  addon_ids: [],
  custom_addons: [],
  start_date: "", // diisi tanggal lokal perangkat di form
  deadline: "",
  stage_id: "", // diisi tahap aktif pertama di halaman
  status: "queue",
  revision_count: 0,
  payment_status: "unpaid",
  dp_amount: 0,
  price_override: null,
  reference_links: "",
  notes: "",
});

export async function getCommissionForEdit(
  id: string,
): Promise<{ values: CommissionInput; snapshot: PriceSnapshot } | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("commissions")
    .select("*, commission_addons(addon_id, custom_name, price)")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;

  const catalog = c.commission_addons.filter((a) => a.addon_id);
  return {
    values: {
      client_username: c.client_username,
      contact_platform: c.contact_platform ?? "",
      contact_handle: c.contact_handle ?? "",
      type_id: c.type_id ?? CUSTOM_TYPE,
      type_custom: c.type_custom ?? "",
      addon_ids: catalog.map((a) => a.addon_id!),
      custom_addons: c.commission_addons
        .filter((a) => !a.addon_id)
        .map((a) => ({ name: a.custom_name ?? "", price: a.price })),
      start_date: c.start_date,
      deadline: c.deadline ?? "",
      stage_id: c.stage_id,
      status: c.status,
      revision_count: c.revision_count,
      payment_status: c.payment_status,
      dp_amount: c.dp_amount,
      price_override: c.price_override,
      reference_links: c.reference_links.join("\n"),
      notes: c.notes ?? "",
    },
    snapshot: {
      typeId: c.type_id,
      basePrice: c.base_price,
      addonPrices: Object.fromEntries(catalog.map((a) => [a.addon_id!, a.price])),
    },
  };
}
