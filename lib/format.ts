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

/** Teks input harga ("50.000", "50,000", "Rp 50.000") → angka; kosong → null. */
export function parseRupiah(value: unknown): number | null {
  if (typeof value === "number") return value;
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

const plain = new Map<string, Intl.NumberFormat>();
/** Isi input harga: "50000" → "50.000" (id-ID) / "50,000" (en-GB); tanpa digit → "". */
export function formatThousands(value: string | number, intl = "id-ID"): string {
  const n = parseRupiah(value);
  if (n === null) return "";
  let f = plain.get(intl);
  if (!f) plain.set(intl, (f = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 })));
  return f.format(n);
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
