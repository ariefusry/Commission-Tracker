"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { todayWib } from "@/lib/date";
import { actionDict, actionLocale } from "@/lib/i18n/action";
import { emailAvailable, sendDiscord, sendEmail } from "@/lib/notify";
import { reminderText } from "@/lib/reminders";
import { WIP_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { catalogItemSchema, reminderSchema, type CatalogItemInput, type ReminderInput } from "@/lib/validators";

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
  const t = await actionDict();
  if (id !== null && !idSchema.safeParse(id).success) return { error: t.actions.invalidId };
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
    if (res.error.code === UNIQUE_VIOLATION) return { fieldErrors: { name: ["nameTaken"] } };
    console.error("saveCatalogItem", res.error);
    return { error: t.actions.saveFailed };
  }
  refresh();
  return { id: res.data?.id };
}

export async function deleteCatalogItem(kind: CatalogKind, id: string): Promise<CatalogResult> {
  const t = await actionDict();
  if (!idSchema.safeParse(id).success) return { error: t.actions.invalidId };
  const supabase = await createClient();

  // Item yang sudah dipakai commission tidak boleh dihapus (data commission lama bergantung padanya).
  const usage =
    kind === "type"
      ? await supabase.from("commissions").select("id", { count: "exact", head: true }).eq("type_id", id)
      : kind === "stage"
        ? await supabase.from("commissions").select("id", { count: "exact", head: true }).eq("stage_id", id)
        : await supabase.from("commission_addons").select("id", { count: "exact", head: true }).eq("addon_id", id);
  if (usage.error) return { error: t.actions.deleteFailed };
  if (usage.count) {
    return { error: t.actions.inUse(usage.count) };
  }

  const { data, error } = await (kind === "type"
    ? supabase.from("commission_types").delete().eq("id", id).select("id")
    : kind === "stage"
      ? supabase.from("stages").delete().eq("id", id).select("id")
      : supabase.from("addons").delete().eq("id", id).select("id"));
  if (error || !data?.length) {
    if (error) console.error("deleteCatalogItem", error);
    return { error: t.actions.deleteFailed };
  }
  refresh();
  return {};
}

/** Tukar urutan tipe/tahap dengan tetangganya. */
export async function moveItem(kind: "type" | "stage", id: string, direction: "up" | "down"): Promise<CatalogResult> {
  const t = await actionDict();
  if (!idSchema.safeParse(id).success) return { error: t.actions.invalidId };
  const table = kind === "type" ? "commission_types" : "stages";
  const supabase = await createClient();
  const { data: rows, error } = await supabase.from(table).select("id, sort_order").order("sort_order").order("name");
  if (error) return { error: t.actions.reorderFailed };

  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return {};

  // Normalisasi urutan 1..n lalu tukar, agar nilai sort_order yang sama tidak membuat swap gagal.
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  const results = await Promise.all(
    order.map((rowId, idx) => supabase.from(table).update({ sort_order: idx + 1 }).eq("id", rowId)),
  );
  if (results.some((r) => r.error)) return { error: t.actions.reorderFailed };
  refresh();
  return {};
}

const preferencesSchema = z
  .object({
    display_name: z.string().trim().max(60, "max60Chars"),
    count_cancelled_paid: z.boolean(),
    show_queue: z.boolean(),
    // Pesan = kunci t.errors.
    slot_limit: z.number({ error: "notNumber" }).int("integer").min(1, "min1").max(50, "max50"),
  })
  .partial();

export async function updatePreferences(input: z.input<typeof preferencesSchema>): Promise<CatalogResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const t = await actionDict();
  const { display_name, ...rest } = parsed.data;
  // "" → null agar halaman tracking menyembunyikan nama.
  const patch = display_name === undefined ? rest : { ...rest, display_name: display_name || null };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: t.actions.sessionExpired };

  const { data, error } = await supabase.from("settings").update(patch).eq("user_id", userId).select("user_id");
  if (error || !data?.length) {
    if (error) console.error("updatePreferences", error);
    return { error: t.actions.saveFailed };
  }
  refresh();
  return {};
}

const REMOVE_BATCH = 100;

/**
 * Hapus akun sendiri: file WIP di Storage dulu (cascade database tidak menyentuh Storage),
 * lalu semua data lewat delete_own_account(). `confirm` = kata konfirmasi dari kamus.
 */
export async function deleteAccount(confirm: string): Promise<CatalogResult> {
  const t = await actionDict();
  if (confirm.trim() !== t.settings.deleteAccountWord) return { error: t.actions.invalidData };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { error: t.actions.sessionExpired };

  // RLS: hanya gambar milik user ini.
  const { data: wip, error: wipError } = await supabase.from("wip_images").select("storage_path");
  if (wipError) {
    console.error("deleteAccount wip", wipError);
    return { error: t.actions.accountDeleteFailed };
  }
  for (let i = 0; i < wip.length; i += REMOVE_BATCH) {
    const paths = wip.slice(i, i + REMOVE_BATCH).map((w) => w.storage_path);
    const removed = await supabase.storage.from(WIP_BUCKET).remove(paths);
    // remove() tidak error bila file tak terhapus (mis. policy) → cek jumlahnya.
    if (removed.error || removed.data.length < paths.length) {
      console.error("deleteAccount storage", removed.error);
      return { error: t.actions.accountDeleteFailed };
    }
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    console.error("deleteAccount", error);
    return { error: t.actions.accountDeleteFailed };
  }
  // User sudah tidak ada: cukup hapus cookie sesi di browser ini.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

/** Simpan pengingat deadline. Bahasa pesan = bahasa UI saat menyimpan. */
export async function saveReminders(input: ReminderInput): Promise<CatalogResult> {
  const t = await actionDict();
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;
  if (v.reminder_channel === "email" && !emailAvailable()) return { error: t.actions.invalidData };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: t.actions.sessionExpired };

  const { data, error } = await supabase
    .from("settings")
    .update({
      reminder_channel: v.reminder_channel,
      discord_webhook_url: v.discord_webhook_url || null,
      reminder_days: v.reminder_days,
      reminder_locale: await actionLocale(),
    })
    .eq("user_id", userId)
    .select("user_id");
  if (error || !data?.length) {
    if (error) console.error("saveReminders", error);
    return { error: t.actions.saveFailed };
  }
  refresh();
  return {};
}

/** Kirim pengingat hari ini (atau pesan tes jika belum ada yang jatuh tempo) ke saluran yang sedang diisi. */
export async function sendTestReminder(input: ReminderInput): Promise<CatalogResult> {
  const t = await actionDict();
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const v = parsed.data;
  if (v.reminder_channel === "off") return { error: t.actions.invalidData };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { error: t.actions.sessionExpired };

  // RLS: hanya commission milik user ini.
  const { data: rows, error } = await supabase
    .from("commissions")
    .select("client_username, deadline, status, type_custom, commission_types(name)")
    .not("status", "in", "(done,cancelled)")
    .not("deadline", "is", null);
  if (error) return { error: t.actions.reminderSendFailed };

  const origin = (await headers()).get("origin") ?? "";
  const list = rows.map((r) => ({ ...r, type_name: r.commission_types?.name ?? r.type_custom ?? "Custom" }));
  const text = reminderText(list, todayWib(), v.reminder_days, t, origin) ?? `**${t.reminders.messageTitle}**\n${t.reminders.messageTestEmpty}`;

  const ok =
    v.reminder_channel === "discord"
      ? await sendDiscord(v.discord_webhook_url, text)
      : await sendEmail(claims.claims.email as string, t.reminders.messageTitle, text);
  return ok ? {} : { error: t.actions.reminderSendFailed };
}
