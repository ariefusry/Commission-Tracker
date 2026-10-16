import "server-only";
import { isAccent, type Accent } from "@/lib/accent";
import { avatarUrl } from "@/lib/storage";
import type { CatalogItem } from "@/components/settings/catalog-editor";
import { emailAvailable } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

const countBy = (ids: (string | null)[]) => {
  const m = new Map<string, number>();
  ids.forEach((id) => id && m.set(id, (m.get(id) ?? 0) + 1));
  return m;
};

export type ReminderChannel = "off" | "discord" | "email";
export type Preferences = {
  display_name: string;
  accent_color: Accent | null;
  /** URL publik foto profil (null = pakai inisial). */
  avatar_url: string | null;
  count_cancelled_paid: boolean;
  show_queue: boolean;
  slot_limit: number;
  reminder_channel: ReminderChannel;
  discord_webhook_url: string;
  reminder_days: number;
  /** Email pengingat bisa dipilih (layanan pengirim sudah dipasang) + alamat tujuan. */
  email_available: boolean;
  email: string;
};

export async function getPreferences(): Promise<Preferences> {
  const supabase = await createClient();
  const [{ data, error }, { data: claims }] = await Promise.all([
    supabase
      .from("settings")
      .select("display_name, accent_color, avatar_path, count_cancelled_paid, show_queue, slot_limit, reminder_channel, discord_webhook_url, reminder_days")
      .maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (error) throw error;
  return {
    display_name: data?.display_name ?? "",
    accent_color: isAccent(data?.accent_color) ? data.accent_color : null,
    avatar_url: data?.avatar_path ? avatarUrl(data.avatar_path) : null,
    count_cancelled_paid: data?.count_cancelled_paid ?? true,
    show_queue: data?.show_queue ?? true,
    slot_limit: data?.slot_limit ?? 5,
    reminder_channel: (data?.reminder_channel as ReminderChannel | undefined) ?? "off",
    discord_webhook_url: data?.discord_webhook_url ?? "",
    reminder_days: data?.reminder_days ?? 3,
    email_available: emailAvailable(),
    email: (claims?.claims.email as string | undefined) ?? "",
  };
}

// Harga contoh dari trigger handle_new_user (migration 20261015170000_drop_subscriptions.sql).
const SAMPLE_PRICES = new Set([
  "Headshot:50000",
  "Bust up:75000",
  "Halfbody:100000",
  "Knee up:125000",
  "Full body:150000",
  "Detailed character:25000",
  "Detailed background:50000",
]);

/** Panduan awal: true jika tipe/add-on sudah berbeda dari harga contoh bawaan. */
export async function hasCustomPrices(): Promise<boolean> {
  const supabase = await createClient();
  const [types, addons] = await Promise.all([
    supabase.from("commission_types").select("name, base_price"),
    supabase.from("addons").select("name, price"),
  ]);
  if (types.error) throw types.error;
  if (addons.error) throw addons.error;
  const items = [...types.data.map((t) => `${t.name}:${t.base_price}`), ...addons.data.map((a) => `${a.name}:${a.price}`)];
  return items.length !== SAMPLE_PRICES.size || items.some((i) => !SAMPLE_PRICES.has(i));
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
