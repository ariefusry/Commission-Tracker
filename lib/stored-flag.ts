import { useSyncExternalStore } from "react";

// Penanda kecil per perangkat di localStorage (petunjuk ditutup, panduan disembunyikan, dll.).
// Bisa kosong atau gagal (mode privat, data situs diblokir): semua akses dibungkus try/catch.

export const FLAGS = {
  boardHintDismissed: "commission-tracker:board-hint-dismissed",
  onboardingDismissed: "commission-tracker:onboarding-dismissed",
  trackingLinkShared: "commission-tracker:tracking-link-shared",
} as const;

export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    return;
  }
  // Event "storage" bawaan hanya untuk tab lain: kabari tab ini juga.
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** `serverValue` dipakai saat render server dan hydration (localStorage belum terbaca). */
export function useFlag(key: string, serverValue: boolean): boolean {
  return useSyncExternalStore(subscribe, () => readFlag(key), () => serverValue);
}
