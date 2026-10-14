import { Constants, type Database } from "@/types/database";

type Enums = Database["public"]["Enums"];
export type Status = Enums["commission_status"];
export type PaymentStatus = Enums["payment_status"];

export const STATUSES = Constants.public.Enums.commission_status;
export const PAYMENT_STATUSES = Constants.public.Enums.payment_status;

/** Tahap pengerjaan milik user (tabel `stages`). */
export type StageOption = { id: string; name: string; is_active: boolean };

export const STATUS_LABEL: Record<Status, string> = {
  queue: "Antre",
  in_progress: "Dikerjakan",
  revision: "Revisi",
  done: "Selesai",
  cancelled: "Batal",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Belum bayar",
  dp: "DP",
  paid: "Lunas",
};

export const CUSTOM_TYPE = "custom";
