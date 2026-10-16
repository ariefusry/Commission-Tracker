import { z } from "zod";
import { CUSTOM_TYPE, PAYMENT_STATUSES, STATUSES } from "@/lib/commission";
import type { ErrorKey } from "@/lib/i18n/id";

// Pesan error = kunci t.errors (lib/i18n); diterjemahkan saat ditampilkan (translateError).
const e = (key: ErrorKey) => key;

const email = z.email(e("invalidEmail")).trim().toLowerCase();
const password = z.string().min(8, e("passwordMin")).max(72, e("passwordMax"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, e("passwordRequired")),
});

export const signupSchema = z
  .object({ email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: e("passwordMismatch"), path: ["confirm"] });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: e("passwordMismatch"), path: ["confirm"] });

const money = z
  .number({ error: e("notNumber") })
  .int(e("noDecimal"))
  .min(0, e("notNegative"))
  // 100 juta: harga dasar + 20 add-on custom tetap muat di kolom integer (maks. ±2,1 miliar).
  .max(100_000_000, e("tooLarge"));

/** Satu link per baris → array, baris kosong dibuang. */
export function parseLinks(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const isHttpUrl = (s: string) => z.url({ protocol: /^https?$/ }).safeParse(s).success;

export const commissionSchema = z
  .object({
    client_username: z.string().trim().min(1, e("required")).max(100),
    contact_platform: z.string().trim().max(50),
    contact_handle: z.string().trim().max(100),
    type_id: z.string().min(1, e("chooseType")), // uuid tipe atau CUSTOM_TYPE
    type_custom: z.string().trim().max(100),
    addon_ids: z.array(z.uuid()),
    custom_addons: z
      .array(z.object({ name: z.string().trim().min(1, e("nameRequired")).max(100), price: money }))
      .max(20),
    start_date: z.iso.date(e("invalidDate")),
    deadline: z.union([z.iso.date(e("invalidDate")), z.literal("")]),
    stage_id: z.uuid(e("chooseStage")),
    status: z.enum(STATUSES),
    revision_count: z.number({ error: e("notNumber") }).int(e("integer")).min(0, e("notNegative")).max(999, e("tooLarge")),
    payment_status: z.enum(PAYMENT_STATUSES),
    dp_amount: money,
    price_override: money.nullable(),
    reference_links: z.string().max(5000),
    notes: z.string().trim().max(5000),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: ErrorKey) => ctx.addIssue({ code: "custom", path: [path], message });

    if (v.type_id === CUSTOM_TYPE) {
      if (!v.type_custom) issue("type_custom", "customTypeName");
      if (v.price_override === null) issue("price_override", "customTypePrice");
    } else if (!z.uuid().safeParse(v.type_id).success) {
      issue("type_id", "chooseType");
    }
    if (v.payment_status === "dp" && v.dp_amount <= 0) issue("dp_amount", "dpRequired");
    if (v.deadline && v.deadline < v.start_date) issue("deadline", "deadlineBeforeStart");
    if (!parseLinks(v.reference_links).every(isHttpUrl)) {
      issue("reference_links", "invalidLinks");
    }
  });

export type CommissionInput = z.input<typeof commissionSchema>;
export type CommissionValues = z.output<typeof commissionSchema>;

/** Ubah cepat dari tabel. */
export const quickUpdateSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("stage_id"), value: z.uuid() }),
  z.object({ field: z.literal("status"), value: z.enum(STATUSES) }),
  z.object({ field: z.literal("payment_status"), value: z.enum(PAYMENT_STATUSES) }),
]);
export type QuickUpdate = z.infer<typeof quickUpdateSchema>;

/** Tipe pesanan / add-on milik user (halaman Pengaturan). */
export const catalogItemSchema = z.object({
  name: z.string().trim().min(1, e("nameRequired")).max(50, e("max50Chars")),
  price: money,
  is_active: z.boolean(),
});
export type CatalogItemInput = z.input<typeof catalogItemSchema>;

/** Sama dengan check constraint settings.discord_webhook_url: hanya webhook resmi Discord. */
export const DISCORD_WEBHOOK_RE = /^https:\/\/(ptb\.|canary\.)?(discord|discordapp)\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/;

/** Pengingat deadline (Pengaturan → Umum). */
export const reminderSchema = z
  .object({
    reminder_channel: z.enum(["off", "discord", "email"]),
    discord_webhook_url: z.string().trim().max(300),
    reminder_days: z.number({ error: e("notNumber") }).int(e("integer")).min(1, e("min1")).max(14, e("tooLarge")),
  })
  .superRefine((v, ctx) => {
    const url = v.discord_webhook_url;
    if ((v.reminder_channel === "discord" || url) && !DISCORD_WEBHOOK_RE.test(url)) {
      ctx.addIssue({ code: "custom", path: ["discord_webhook_url"], message: e("invalidWebhook") });
    }
  });
export type ReminderInput = z.input<typeof reminderSchema>;
