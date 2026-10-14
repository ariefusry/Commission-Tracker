import type { PaymentStatus } from "@/lib/commission";

// Satu-satunya tempat logika harga. Semua nilai integer rupiah.

export type PriceInput = {
  basePrice: number;
  addonPrices: number[];
  override: number | null;
};

/** Harga total = harga tipe + add-on, kecuali override terisi. */
export function priceTotal({ basePrice, addonPrices, override }: PriceInput): number {
  if (override !== null) return override;
  return addonPrices.reduce((sum, p) => sum + p, basePrice);
}

/** Uang yang sudah masuk: paid → total, dp → nominal DP, unpaid → 0. */
export function amountPaid(total: number, status: PaymentStatus, dpAmount: number): number {
  if (status === "paid") return total;
  if (status === "dp") return dpAmount;
  return 0;
}

export function amountDue(total: number, status: PaymentStatus, dpAmount: number): number {
  return total - amountPaid(total, status, dpAmount);
}
