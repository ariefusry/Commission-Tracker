import type { CatalogKind } from "@/app/[lang]/(admin)/settings/actions";

// Modul biasa (bukan "use client") agar bisa dipakai server page dan client tabs.
// Judul & deskripsi tab di kamus: t.settings.tabs[kind].
export type SettingsTab = CatalogKind | "general";

export const SETTINGS_TABS: SettingsTab[] = ["type", "addon", "stage", "general"];

export const parseSettingsTab = (v: unknown): SettingsTab => SETTINGS_TABS.find((t) => t === v) ?? "type";
