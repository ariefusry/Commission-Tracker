import { z } from "zod";
import { CUSTOM_TYPE, PAYMENT_STATUSES, STATUSES } from "@/lib/commission";

const email = z.email("Email tidak valid").trim().toLowerCase();
const password = z.string().min(8, "Password minimal 8 karakter").max(72, "Password terlalu panjang");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi"),
});

export const signupSchema = z
  .object({ email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Password tidak sama", path: ["confirm"] });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Password tidak sama", path: ["confirm"] });

const money = z
  .number({ error: "Harus berupa angka" })
  .int("Tanpa desimal")
  .min(0, "Tidak boleh negatif")
  .max(1_000_000_000, "Terlalu besar");

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
    client_username: z.string().trim().min(1, "Wajib diisi").max(100),
    contact_platform: z.string().trim().max(50),
    contact_handle: z.string().trim().max(100),
    type_id: z.string().min(1, "Pilih tipe"), // uuid tipe atau CUSTOM_TYPE
    type_custom: z.string().trim().max(100),
    addon_ids: z.array(z.uuid()),
    custom_addons: z
      .array(z.object({ name: z.string().trim().min(1, "Nama wajib diisi").max(100), price: money }))
      .max(20),
    start_date: z.iso.date("Tanggal tidak valid"),
    deadline: z.union([z.iso.date("Tanggal tidak valid"), z.literal("")]),
    stage_id: z.uuid("Pilih tahap"),
    status: z.enum(STATUSES),
    revision_count: z.number({ error: "Harus berupa angka" }).int().min(0).max(999),
    payment_status: z.enum(PAYMENT_STATUSES),
    dp_amount: money,
    price_override: money.nullable(),
    reference_links: z.string().max(5000),
    notes: z.string().trim().max(5000),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (v.type_id === CUSTOM_TYPE) {
      if (!v.type_custom) issue("type_custom", "Isi nama tipe custom");
      if (v.price_override === null) issue("price_override", "Tipe custom wajib diisi harga manual");
    } else if (!z.uuid().safeParse(v.type_id).success) {
      issue("type_id", "Pilih tipe");
    }
    if (v.payment_status === "dp" && v.dp_amount <= 0) issue("dp_amount", "Isi nominal DP");
    if (v.deadline && v.deadline < v.start_date) issue("deadline", "Deadline sebelum tanggal mulai");
    if (!parseLinks(v.reference_links).every(isHttpUrl)) {
      issue("reference_links", "Setiap baris harus link http(s) yang valid");
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
  name: z.string().trim().min(1, "Nama wajib diisi").max(50, "Maksimal 50 karakter"),
  price: money,
  is_active: z.boolean(),
});
export type CatalogItemInput = z.input<typeof catalogItemSchema>;
