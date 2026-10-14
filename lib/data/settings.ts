import "server-only";
import type { CatalogItem } from "@/components/settings/catalog-editor";
import { createClient } from "@/lib/supabase/server";

const countBy = (ids: (string | null)[]) => {
  const m = new Map<string, number>();
  ids.forEach((id) => id && m.set(id, (m.get(id) ?? 0) + 1));
  return m;
};

export async function getCatalog(): Promise<{ types: CatalogItem[]; addons: CatalogItem[] }> {
  const supabase = await createClient();
  const [types, addons, usedTypes, usedAddons] = await Promise.all([
    supabase.from("commission_types").select("id, name, base_price, is_active").order("sort_order").order("name"),
    supabase.from("addons").select("id, name, price, is_active").order("name"),
    supabase.from("commissions").select("type_id"),
    supabase.from("commission_addons").select("addon_id"),
  ]);
  for (const r of [types, addons, usedTypes, usedAddons]) if (r.error) throw r.error;

  const typeCount = countBy(usedTypes.data!.map((c) => c.type_id));
  const addonCount = countBy(usedAddons.data!.map((a) => a.addon_id));
  return {
    types: types.data!.map((t) => ({ id: t.id, name: t.name, price: t.base_price, is_active: t.is_active, used: typeCount.get(t.id) ?? 0 })),
    addons: addons.data!.map((a) => ({ id: a.id, name: a.name, price: a.price, is_active: a.is_active, used: addonCount.get(a.id) ?? 0 })),
  };
}
