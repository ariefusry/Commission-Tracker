import en from "@/lib/i18n/en";
import id, { type Dict, type ErrorKey } from "@/lib/i18n/id";

export type { Dict };
export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";
/** Cookie pilihan bahasa; proxy.ts me-rewrite /x → /{lang}/x berdasarkan cookie ini. */
export const LANG_COOKIE = "lang";

const DICTS: Record<Locale, Dict> = { id, en };

export const toLocale = (v: unknown): Locale => (LOCALES.includes(v as Locale) ? (v as Locale) : DEFAULT_LOCALE);
export const dictFor = (locale: Locale): Dict => DICTS[locale];

/** Pesan Zod/server berupa kunci `errors` → teks. Teks lain dikembalikan apa adanya. */
export const translateError = (t: Dict, message: string | undefined) =>
  message === undefined ? undefined : (t.errors[message as ErrorKey] ?? message);
