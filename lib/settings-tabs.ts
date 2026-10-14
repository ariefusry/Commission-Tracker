import type { CatalogKind } from "@/app/(admin)/settings/actions";

// Modul biasa (bukan "use client") agar bisa dipakai server page dan client tabs.
export type SettingsTab = CatalogKind | "general";

export const SETTINGS_TABS: { kind: SettingsTab; title: string; label: string; description: string }[] = [
  {
    kind: "type",
    title: "Tipe pesanan",
    label: "tipe",
    description: "Harga dasar per tipe. Urutan di sini menjadi urutan pilihan di form commission.",
  },
  { kind: "addon", title: "Add-on", label: "add-on", description: "Tambahan harga yang bisa dicentang di form commission." },
  {
    kind: "stage",
    title: "Tahap",
    label: "tahap",
    description: "Alur pengerjaan commission. Urutan di sini menjadi urutan pilihan Tahap.",
  },
  {
    kind: "general",
    title: "Umum",
    label: "umum",
    description: "Nama yang tampil di halaman tracking client dan cara menghitung uang masuk.",
  },
];

export const parseSettingsTab = (v: unknown): SettingsTab => SETTINGS_TABS.find((t) => t.kind === v)?.kind ?? "type";
