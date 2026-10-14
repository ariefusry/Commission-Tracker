import { Constants, type Database } from "@/types/database";

type Enums = Database["public"]["Enums"];
export type Stage = Enums["commission_stage"];
export type Status = Enums["commission_status"];
export type PaymentStatus = Enums["payment_status"];

export const STAGES = Constants.public.Enums.commission_stage;
export const STATUSES = Constants.public.Enums.commission_status;
export const PAYMENT_STATUSES = Constants.public.Enums.payment_status;

export const STAGE_LABEL: Record<Stage, string> = {
  queue: "Antrean",
  sketch: "Sketsa",
  lineart: "Lineart",
  coloring: "Coloring",
  finishing: "Finishing",
  custom: "Custom",
};

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
