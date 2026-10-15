"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export type Theme = "light" | "dark" | "system";
const KEY = "theme";
const ORDER: Theme[] = ["system", "light", "dark"];

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Pasang class .dark di <html> sesuai pilihan (sama dengan script anti-kedip di layout). */
function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onSystem = () => {
    if (read() === "system") apply("system");
  };
  media().addEventListener("change", onSystem);
  return () => {
    listeners.delete(cb);
    media().removeEventListener("change", onSystem);
  };
}

function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // penyimpanan diblokir: tema tetap berlaku untuk sesi ini
  }
  apply(theme);
  listeners.forEach((l) => l());
}

/** Tombol siklus tema: sistem → terang → gelap. */
export function ThemeToggle() {
  // Server tidak tahu pilihan user → "system" sampai hydrate.
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const { t } = useDict();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`${t.theme[theme]}. ${t.theme.change}`}
      title={t.theme[theme]}
      onClick={() => setTheme(next)}
    >
      <Icon />
    </Button>
  );
}

/** Script anti-kedip: dijalankan sebelum halaman tampil. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
