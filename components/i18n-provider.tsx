"use client";

import { createContext, use } from "react";
import { dictFor, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("id");

/** Bahasa aktif untuk Client Component; nilainya dari root layout app/[lang]. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useDict() {
  const locale = use(LocaleContext);
  return { locale, t: dictFor(locale) };
}
