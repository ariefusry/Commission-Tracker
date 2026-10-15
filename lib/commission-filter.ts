import type { PaymentStatus, Status } from "@/lib/commission";

type Filterable = {
  client_username: string;
  type_name: string;
  start_date: string;
  deadline: string | null;
  status: Status;
  payment_status: PaymentStatus;
  price_total: number;
};

export type CommissionFilter = {
  q: string;
  status: Status | "";
  payment: PaymentStatus | "";
  type: string;
  from: string; // tanggal mulai >= from
  to: string; // tanggal mulai <= to
};

export const EMPTY_FILTER: CommissionFilter = { q: "", status: "", payment: "", type: "", from: "", to: "" };

// Label urutan di kamus: t.sorts.
export const SORT_KEYS = ["newest", "deadline", "total", "client"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function activeFilterCount(f: CommissionFilter): number {
  return Object.values(f).filter(Boolean).length;
}

const compareBy: Record<SortKey, (a: Filterable, b: Filterable) => number> = {
  newest: (a, b) => b.start_date.localeCompare(a.start_date),
  // Tanpa deadline di paling bawah.
  deadline: (a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"),
  total: (a, b) => b.price_total - a.price_total,
  client: (a, b) => a.client_username.localeCompare(b.client_username, "id", { sensitivity: "base" }),
};

export function applyFilter<T extends Filterable>(rows: T[], f: CommissionFilter, sort: SortKey): T[] {
  const q = f.q.trim().toLowerCase();
  return rows
    .filter(
      (r) =>
        (!q || r.client_username.toLowerCase().includes(q)) &&
        (!f.status || r.status === f.status) &&
        (!f.payment || r.payment_status === f.payment) &&
        (!f.type || r.type_name === f.type) &&
        (!f.from || r.start_date >= f.from) &&
        (!f.to || r.start_date <= f.to),
    )
    .sort(compareBy[sort]);
}
