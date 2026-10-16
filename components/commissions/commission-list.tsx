"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { ChevronDown, Pencil, SearchX } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { deleteCommission, quickUpdate } from "@/app/[lang]/(admin)/commissions/actions";
import { AppSelect } from "@/components/app-select";
import { CommissionToolbar } from "@/components/commissions/commission-toolbar";
import { CopyTrackingLink } from "@/components/commissions/copy-tracking-link";
import { useDict } from "@/components/i18n-provider";
import { useToast } from "@/components/toast";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PAYMENT_STATUSES,
  STATUSES,
  type PaymentStatus,
  type StageOption,
  type Status,
} from "@/lib/commission";
import { applyFilter, EMPTY_FILTER, type CommissionFilter, type SortKey } from "@/lib/commission-filter";
import { deadlineInfo, deadlineLabel, type DeadlineTone } from "@/lib/deadline";
import { formatDate, formatRupiah } from "@/lib/format";
import { amountDue } from "@/lib/pricing";
import type { Dict } from "@/lib/i18n";
import type { QuickUpdate } from "@/lib/validators";

export type CommissionRow = {
  id: string;
  tracking_code: string;
  client_username: string;
  type_name: string;
  start_date: string;
  deadline: string | null;
  stage_id: string;
  completed_at: string | null;
  queue_order: number;
  status: Status;
  payment_status: PaymentStatus;
  dp_amount: number;
  price_total: number;
};

type OnUpdate = (row: CommissionRow, update: QuickUpdate) => void;

/**
 * Ubah tahap/status/bayar dari daftar atau board, lalu toast "nama → nilai · Urungkan".
 * Bayar yang semula DP tidak bisa diurungkan: nominal DP sudah di-reset (DP hanya lewat form).
 */
export function useQuickUpdate(stages: StageOption[], startTransition: React.TransitionStartFunction): OnUpdate {
  const { t } = useDict();
  const toast = useToast();
  return useCallback<OnUpdate>(
    function run(row, update) {
      startTransition(async () => {
        const result = await quickUpdate(row.id, update);
        if (result.error) return toast({ message: result.error, tone: "error" });
        const label =
          update.field === "stage_id"
            ? (stages.find((s) => s.id === update.value)?.name ?? "")
            : update.field === "status"
              ? t.status[update.value]
              : t.payment[update.value];
        const previous = { field: update.field, value: row[update.field] } as QuickUpdate;
        const undoable = !(update.field === "payment_status" && row.payment_status === "dp");
        toast({
          message: t.toast.updated(row.client_username, label),
          action: undoable
            ? { label: t.toast.undo, onClick: () => run({ ...row, [update.field]: update.value }, previous) }
            : undefined,
        });
      });
    },
    [stages, startTransition, t, toast],
  );
}

const TONE_CLASS: Record<DeadlineTone, string> = {
  late: "text-destructive font-medium",
  soon: "text-amber-600 dark:text-amber-400 font-medium",
  normal: "text-muted-foreground",
  none: "text-muted-foreground",
};

export function Deadline({ row, today }: { row: CommissionRow; today: string }) {
  const { t } = useDict();
  const info = deadlineInfo(row.deadline, row.status, today);
  const label = deadlineLabel(info, t);
  return (
    <div className="grid">
      <span>{formatDate(row.deadline, t.intl)}</span>
      {label && <span className={`text-xs ${TONE_CLASS[info.tone]}`}>{label}</span>}
    </div>
  );
}

export function Total({ row }: { row: CommissionRow }) {
  const { t } = useDict();
  const due = row.status === "cancelled" ? 0 : amountDue(row.price_total, row.payment_status, row.dp_amount);
  return (
    <div className="grid justify-items-end tabular-nums">
      <span className={row.status === "cancelled" ? "text-muted-foreground line-through" : "font-medium"}>
        {formatRupiah(row.price_total)}
      </span>
      {due > 0 && <span className="text-xs text-muted-foreground">{t.commissions.due(formatRupiah(due))}</span>}
    </div>
  );
}

const paymentLabel = (row: CommissionRow, t: Dict) =>
  row.payment_status === "dp" ? `${t.payment.dp} ${formatRupiah(row.dp_amount)}` : t.payment[row.payment_status];

function QuickSelects({ row, stages, onUpdate, pending, labelled }: { row: CommissionRow; stages: StageOption[]; onUpdate: OnUpdate; pending: boolean; labelled?: boolean }) {
  const { t } = useDict();
  const selects = [
    {
      key: "stage_id" as const,
      label: t.commissions.stage,
      value: row.stage_id,
      // Tahap nonaktif tetap tampil untuk commission yang sedang memakainya.
      options: stages.filter((st) => st.is_active || st.id === row.stage_id).map((st) => st.id),
      labels: Object.fromEntries(stages.map((st) => [st.id, st.name])),
      custom: null,
    },
    {
      key: "status" as const,
      label: t.commissions.status,
      value: row.status,
      options: STATUSES,
      labels: t.status as Record<string, string>,
      custom: null,
    },
    {
      key: "payment_status" as const,
      label: t.commissions.payment,
      value: row.payment_status,
      options: PAYMENT_STATUSES,
      labels: t.payment as Record<string, string>,
      custom: row.payment_status === "dp" ? paymentLabel(row, t) : null,
    },
  ];

  return selects.map((s) => (
    <div key={s.key} className="grid min-w-0 gap-1">
      {labelled && <span className="text-xs text-muted-foreground">{s.label}</span>}
      <AppSelect
        size="sm"
        aria-label={`${s.label} ${row.client_username}`}
        value={s.value}
        disabled={pending}
        onValueChange={(value) => value !== s.value && onUpdate(row, { field: s.key, value } as QuickUpdate)}
        options={s.options.map((o: string) => ({ value: o, label: o === s.value && s.custom ? s.custom : s.labels[o] }))}
      />
    </div>
  ));
}

export function EditLink({ row }: { row: CommissionRow }) {
  const { t } = useDict();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t.common.edit(row.client_username)}
      nativeButton={false}
      render={<Link href={`/commissions/${row.id}`} />}
    >
      <Pencil />
    </Button>
  );
}

export function DeleteButton({ row }: { row: CommissionRow }) {
  const { t } = useDict();
  const toast = useToast();
  return (
    <ConfirmDeleteButton
      label={t.common.deleteNamed(row.client_username)}
      title={t.commissions.deleteTitle(row.client_username)}
      description={t.commissions.deleteBody}
      onConfirm={async () => {
        const result = await deleteCommission(row.id);
        if (!result.error) toast({ message: t.toast.deleted(row.client_username) });
        return result;
      }}
    />
  );
}

export function Actions({ row }: { row: CommissionRow }) {
  return (
    <div className="flex justify-end">
      <CopyTrackingLink code={row.tracking_code} name={row.client_username} />
      <EditLink row={row} />
      <DeleteButton row={row} />
    </div>
  );
}

/**
 * Kartu HP: ringkasan dulu (nama, total, deadline, salin link). Ubah tahap/status/bayar
 * dan hapus satu tingkat lebih dalam, di balik baris status yang bisa dibuka.
 */
function MobileCard({ row, today, stages, onUpdate, pending }: { row: CommissionRow; today: string; stages: StageOption[]; onUpdate: OnUpdate; pending: boolean }) {
  const { t } = useDict();
  const stage = stages.find((s) => s.id === row.stage_id)?.name;
  return (
    <li className="rounded-xl border bg-card">
      <div className="grid gap-2 p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0">
            <Link href={`/commissions/${row.id}`} className="truncate font-medium">
              {row.client_username}
            </Link>
            <span className="text-sm text-muted-foreground">{row.type_name}</span>
          </div>
          <Total row={row} />
        </div>
        <div className="flex items-end justify-between gap-3 text-sm">
          <Deadline row={row} today={today} />
          <div className="flex">
            <CopyTrackingLink code={row.tracking_code} name={row.client_username} />
            <EditLink row={row} />
          </div>
        </div>
      </div>
      <details className="disclosure group border-t">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm [&::-webkit-details-marker]:hidden">
          <span className="sr-only">{t.commissions.quickEdit}:</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {[stage, t.status[row.status], paymentLabel(row, t)].filter(Boolean).join(" · ")}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="grid gap-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 [&>*:last-child]:col-span-2">
            <QuickSelects row={row} stages={stages} onUpdate={onUpdate} pending={pending} labelled />
          </div>
          <div className="flex justify-end">
            <DeleteButton row={row} />
          </div>
        </div>
      </details>
    </li>
  );
}

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, CommissionRow>();

function buildColumns(onUpdate: OnUpdate, pending: boolean, today: string, stages: StageOption[], t: Dict) {
  return helper.columns([
    helper.accessor("client_username", {
      header: t.commissions.client,
      cell: ({ row }) => (
        <div className="grid">
          <Link href={`/commissions/${row.original.id}`} className="font-medium underline-offset-4 hover:underline">
            {row.original.client_username}
          </Link>
          <span className="text-xs text-muted-foreground">{row.original.type_name}</span>
        </div>
      ),
    }),
    helper.accessor("deadline", { header: t.commissions.deadline, cell: ({ row }) => <Deadline row={row.original} today={today} /> }),
    helper.display({
      id: "progress",
      header: () => (
        <div className="grid grid-cols-3 gap-2">
          <span title={t.form.stageHint} className="w-fit cursor-help underline decoration-dotted underline-offset-4">
            {t.commissions.stage}
          </span>
          <span title={t.form.statusHint} className="w-fit cursor-help underline decoration-dotted underline-offset-4">
            {t.commissions.status}
          </span>
          <span>{t.commissions.payment}</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="grid min-w-[26rem] grid-cols-3 gap-2">
          <QuickSelects row={row.original} stages={stages} onUpdate={onUpdate} pending={pending} />
        </div>
      ),
    }),
    helper.accessor("price_total", {
      header: () => <div className="text-right">{t.common.total}</div>,
      cell: ({ row }) => <Total row={row.original} />,
    }),
    helper.display({
      id: "actions",
      header: () => <span className="sr-only">{t.commissions.actions}</span>,
      cell: ({ row }) => <Actions row={row.original} />,
    }),
  ]);
}

export function CommissionList({ data, today, stages }: { data: CommissionRow[]; today: string; stages: StageOption[] }) {
  const [pending, startTransition] = useTransition();
  const { t } = useDict();
  const onUpdate = useQuickUpdate(stages, startTransition);
  const [filter, setFilter] = useState<CommissionFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>("newest");
  const visible = useMemo(() => applyFilter(data, filter, sort), [data, filter, sort]);
  const types = useMemo(() => [...new Set(data.map((r) => r.type_name))].sort(), [data]);

  const columns = useMemo(() => buildColumns(onUpdate, pending, today, stages, t), [onUpdate, pending, today, stages, t]);
  const table = useTable({ features, columns, data: visible });

  return (
    <div className="grid min-w-0 gap-3">
      <CommissionToolbar filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} types={types} today={today} />
      {visible.length !== data.length && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t.commissions.showing(visible.length, data.length)}
        </p>
      )}
      {visible.length === 0 && (
        <StateMessage icon={SearchX} title={t.commissions.noMatch} description={t.commissions.noMatchBody}>
          <Button variant="outline" size="sm" onClick={() => setFilter(EMPTY_FILTER)}>
            {t.commissions.resetFilter}
          </Button>
        </StateMessage>
      )}
      {/* HP: kartu */}
      {/* Kartu sampai layar lebar: tabel butuh ~860px, sisa ruang di samping sidebar 1024px hanya ~720px. */}
      <ul className="grid gap-3 md:grid-cols-2 md:items-start xl:hidden">
        {visible.map((row) => (
          <MobileCard key={row.id} row={row} today={today} stages={stages} onUpdate={onUpdate} pending={pending} />
        ))}
      </ul>

      {/* Desktop: tabel */}
      <div className={visible.length ? "hidden rounded-xl border xl:block" : "hidden"}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
