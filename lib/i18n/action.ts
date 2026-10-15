import { cookies } from "next/headers";
import { dictFor, LANG_COOKIE, toLocale } from "@/lib/i18n";

/** Kamus untuk Server Action (next/root-params tidak tersedia di action). */
export async function actionLocale() {
  return toLocale((await cookies()).get(LANG_COOKIE)?.value);
}

export async function actionDict() {
  return dictFor(await actionLocale());
}
