import type { CSSProperties } from "react";

// Warna aksen halaman tracking, dipilih artist di Pengaturan → Umum.
// Kunci = nilai settings.accent_color (check constraint di migration 20261017000000 harus sama).
// Semua lolos WCAG AA untuk teks putih di atasnya (kontras 5,15–5,98 : 1).
export const ACCENTS = {
  rose: "oklch(0.55 0.2 15)",
  orange: "oklch(0.55 0.16 45)",
  emerald: "oklch(0.52 0.12 160)",
  sky: "oklch(0.53 0.13 240)",
  violet: "oklch(0.52 0.19 290)",
  pink: "oklch(0.55 0.2 350)",
} as const;

export type Accent = keyof typeof ACCENTS;
export const ACCENT_KEYS = Object.keys(ACCENTS) as [Accent, ...Accent[]];

export const isAccent = (value: unknown): value is Accent => typeof value === "string" && value in ACCENTS;

/** Ganti token primary di dalam elemen (stepper, avatar); null/tak dikenal = netral bawaan tema. */
export function accentStyle(value: unknown): CSSProperties | undefined {
  if (!isAccent(value)) return undefined;
  return { "--primary": ACCENTS[value], "--primary-foreground": "oklch(0.985 0 0)" } as CSSProperties;
}
