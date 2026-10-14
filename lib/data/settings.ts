import "server-only";
import type { CatalogItem } from "@/components/settings/catalog-editor";
import { createClient } from "@/lib/supabase/server";

const countBy = (ids: (string | null)[]) => {
  const m = new Map<string, number>();
  ids.forEach((id) => id && m.set(id, (m.get(id) ?? 0) + 1));
  return m;
};

export type Preferences = { display_name: string; count_cancelled_paid: boolean; show_queue: boolean; slot_limit: number };

export async function getPreferences(): Promise<Preferences> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("display_name, count_cancelled_paid, show_queue, slot_limit").maybeSingle();
  if (error) throw error;
  return {
    display_name: data?.display_name ?? "",
    count_cancelled_paid: data?.count_cancelled_paid ?? true,
    show_queue: data?.show_queue ?? true,
    slot_limit: data?.slot_limit ?? 5,
  };
}

export async function getCatalog(): Promise<{ types: CatalogItem[]; addons: CatalogItem[]; stages: CatalogItem[] }> {
  const supabase = await createClient();
  const [types, addons, stages, used, usedAddons] = await Promise.all([
    supabase.from("commission_types").select("id, name, base_price, is_active").order("sort_order").order("name"),
    supabase.from("addons").select("id, name, price, is_active").order("name"),
    supabase.from("stages").select("id, name, is_active").order("sort_order").order("name"),
    supabase.from("commissions").select("type_id, stage_id"),
    supabase.from("commission_addons").select("addon_id"),
  ]);
  for (const r of [types, addons, stages, used, usedAddons]) if (r.error) throw r.error;

  const typeCount = countBy(used.data!.map((c) => c.type_id));
  const stageCount = countBy(used.data!.map((c) => c.stage_id));
  const addonCount = countBy(usedAddons.data!.map((a) => a.addon_id));
  return {
    types: types.data!.map((t) => ({ id: t.id, name: t.name, price: t.base_price, is_active: t.is_active, used: typeCount.get(t.id) ?? 0 })),
    addons: addons.data!.map((a) => ({ id: a.id, name: a.name, price: a.price, is_active: a.is_active, used: addonCount.get(a.id) ?? 0 })),
    stages: stages.data!.map((st) => ({ id: st.id, name: st.name, price: 0, is_active: st.is_active, used: stageCount.get(st.id) ?? 0 })),
  };
}
