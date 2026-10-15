"use client";

import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { LANG_COOKIE } from "@/lib/i18n";

/** Ganti ID ↔ EN: simpan di cookie lalu muat ulang (proxy membaca cookie untuk memilih bahasa). */
export function LanguageToggle() {
  const { locale, t } = useDict();
  const next = locale === "id" ? "en" : "id";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-xs font-semibold"
      aria-label={t.language.switchTo}
      title={t.language.switchTo}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        location.reload();
      }}
    >
      {t.language.short}
    </Button>
  );
}
