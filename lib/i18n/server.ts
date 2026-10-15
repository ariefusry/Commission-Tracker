import { lang } from "next/root-params";
import { dictFor, toLocale } from "@/lib/i18n";

/** Kamus untuk Server Component, dari segmen root app/[lang] (tetap bisa prerender per bahasa). */
export async function getDict() {
  const locale = toLocale(await lang());
  return { locale, t: dictFor(locale) };
}
