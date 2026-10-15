const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

// `intl` = t.intl dari kamus (id-ID / en-GB). Formatter di-cache per locale.
const cache = new Map<string, Intl.DateTimeFormat>();
function dateFormat(intl: string, options: Intl.DateTimeFormatOptions) {
  const key = intl + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.DateTimeFormat(intl, { ...options, timeZone: "UTC" })));
  return f;
}

export function formatRupiah(value: number): string {
  return rupiah.format(value);
}

/** Tanggal `YYYY-MM-DD` dari database → "15 Okt 2026" / "15 Oct 2026". */
export function formatDate(value: string | null, intl = "id-ID"): string {
  return value ? dateFormat(intl, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`)) : "-";
}

/** Label sumbu grafik: `YYYY-MM-DD` → "12 Okt", `YYYY-MM` → "Okt 26". */
export function formatPeriodKey(key: string, intl = "id-ID"): string {
  return key.length === 10
    ? dateFormat(intl, { day: "numeric", month: "short" }).format(new Date(`${key}T00:00:00Z`))
    : dateFormat(intl, { month: "short", year: "2-digit" }).format(new Date(`${key}-01T00:00:00Z`));
}
