import type { CatalogKind } from "@/app/(admin)/settings/actions";

// Modul biasa (bukan "use client") agar bisa dipakai server page dan client tabs.
export type SettingsTab = CatalogKind | "payment";

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
    kind: "payment",
    title: "Pembayaran",
    label: "pembayaran",
    description: "Cara menghitung uang masuk di dashboard.",
  },
];

export const parseSettingsTab = (v: unknown): SettingsTab => SETTINGS_TABS.find((t) => t.kind === v)?.kind ?? "type";
