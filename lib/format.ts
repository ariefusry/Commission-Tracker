const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const date = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatRupiah(value: number): string {
  return rupiah.format(value);
}

/** Tanggal `YYYY-MM-DD` dari database → "15 Okt 2026". */
export function formatDate(value: string | null): string {
  return value ? date.format(new Date(`${value}T00:00:00Z`)) : "-";
}
