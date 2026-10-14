"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { deleteCommission, quickUpdate } from "@/app/(admin)/commissions/actions";
import { AppSelect } from "@/components/app-select";
import { CommissionToolbar } from "@/components/commissions/commission-toolbar";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PAYMENT_LABEL,
  PAYMENT_STATUSES,
  STATUS_LABEL,
  STATUSES,
  type PaymentStatus,
  type StageOption,
  type Status,
} from "@/lib/commission";
import { applyFilter, EMPTY_FILTER, type CommissionFilter, type SortKey } from "@/lib/commission-filter";
import { deadlineInfo, type DeadlineTone } from "@/lib/deadline";
import { formatDate, formatRupiah } from "@/lib/format";
import { amountDue } from "@/lib/pricing";
import type { QuickUpdate } from "@/lib/validators";

export type CommissionRow = {
  id: string;
  client_username: string;
  type_name: string;
  start_date: string;
  deadline: string | null;
  stage_id: string;
  status: Status;
  payment_status: PaymentStatus;
  dp_amount: number;
  price_total: number;
};

type OnUpdate = (id: string, update: QuickUpdate) => void;

const TONE_CLASS: Record<DeadlineTone, string> = {
  late: "text-destructive font-medium",
  soon: "text-amber-600 dark:text-amber-400 font-medium",
  normal: "text-muted-foreground",
  none: "text-muted-foreground",
};

function Deadline({ row, today }: { row: CommissionRow; today: string }) {
  const info = deadlineInfo(row.deadline, row.status, today);
  return (
    <div className="grid">
      <span>{formatDate(row.deadline)}</span>
      {info.label && <span className={`text-xs ${TONE_CLASS[info.tone]}`}>{info.label}</span>}
    </div>
  );
}

function Total({ row }: { row: CommissionRow }) {
  const due = row.status === "cancelled" ? 0 : amountDue(row.price_total, row.payment_status, row.dp_amount);
  return (
    <div className="grid justify-items-end tabular-nums">
      <span className={row.status === "cancelled" ? "text-muted-foreground line-through" : "font-medium"}>
        {formatRupiah(row.price_total)}
      </span>
      {due > 0 && <span className="text-xs text-muted-foreground">Sisa {formatRupiah(due)}</span>}
    </div>
  );
}

function QuickSelects({ row, stages, onUpdate, pending, labelled }: { row: CommissionRow; stages: StageOption[]; onUpdate: OnUpdate; pending: boolean; labelled?: boolean }) {
  const selects = [
    {
      key: "stage_id" as const,
      label: "Tahap",
      value: row.stage_id,
      // Tahap nonaktif tetap tampil untuk commission yang sedang memakainya.
      options: stages.filter((st) => st.is_active || st.id === row.stage_id).map((st) => st.id),
      labels: Object.fromEntries(stages.map((st) => [st.id, st.name])),
      custom: null,
    },
    {
      key: "status" as const,
      label: "Status",
      value: row.status,
      options: STATUSES,
      labels: STATUS_LABEL as Record<string, string>,
      custom: null,
    },
    {
      key: "payment_status" as const,
      label: "Bayar",
      value: row.payment_status,
      options: PAYMENT_STATUSES,
      labels: PAYMENT_LABEL as Record<string, string>,
      custom: row.payment_status === "dp" ? `DP ${formatRupiah(row.dp_amount)}` : null,
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
        onValueChange={(value) => value !== s.value && onUpdate(row.id, { field: s.key, value } as QuickUpdate)}
        options={s.options.map((o: string) => ({ value: o, label: o === s.value && s.custom ? s.custom : s.labels[o] }))}
      />
    </div>
  ));
}

function Actions({ row }: { row: CommissionRow }) {
  return (
    <div className="flex justify-end">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${row.client_username}`}
        nativeButton={false}
        render={<Link href={`/commissions/${row.id}`} />}
      >
        <Pencil />
      </Button>
      <ConfirmDeleteButton
        label={`Hapus ${row.client_username}`}
        title={`Hapus commission ${row.client_username}?`}
        description="Data commission dan add-on-nya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        onConfirm={() => deleteCommission(row.id)}
      />
    </div>
  );
}

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, CommissionRow>();

function buildColumns(onUpdate: OnUpdate, pending: boolean, today: string, stages: StageOption[]) {
  return helper.columns([
    helper.accessor("client_username", {
      header: "Client",
      cell: ({ row }) => (
        <div className="grid">
          <Link href={`/commissions/${row.original.id}`} className="font-medium underline-offset-4 hover:underline">
            {row.original.client_username}
          </Link>
          <span className="text-xs text-muted-foreground">{row.original.type_name}</span>
        </div>
      ),
    }),
    helper.accessor("deadline", { header: "Deadline", cell: ({ row }) => <Deadline row={row.original} today={today} /> }),
    helper.display({
      id: "progress",
      header: () => (
        <div className="grid grid-cols-3 gap-2">
          <span>Tahap</span>
          <span>Status</span>
          <span>Bayar</span>
        </div>
      ),
      cell: ({ row }) => (
        <div className="grid min-w-[26rem] grid-cols-3 gap-2">
          <QuickSelects row={row.original} stages={stages} onUpdate={onUpdate} pending={pending} />
        </div>
      ),
    }),
    helper.accessor("price_total", {
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => <Total row={row.original} />,
    }),
    helper.display({
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => <Actions row={row.original} />,
    }),
  ]);
}

export function CommissionList({ data, today, stages }: { data: CommissionRow[]; today: string; stages: StageOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUpdate = useCallback<OnUpdate>(
    (id, update) =>
      startTransition(async () => {
        const result = await quickUpdate(id, update);
        setError(result.error ?? null);
      }),
    [],
  );
  const [filter, setFilter] = useState<CommissionFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>("newest");
  const visible = useMemo(() => applyFilter(data, filter, sort), [data, filter, sort]);
  const types = useMemo(() => [...new Set(data.map((r) => r.type_name))].sort(), [data]);

  const columns = useMemo(() => buildColumns(onUpdate, pending, today, stages), [onUpdate, pending, today, stages]);
  const table = useTable({ features, columns, data: visible });

  return (
    <div className="grid gap-3">
      <CommissionToolbar filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} types={types} today={today} />
      {visible.length !== data.length && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Menampilkan {visible.length} dari {data.length}
        </p>
      )}
      {visible.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">Tidak ada commission yang cocok</p>
          <Button variant="outline" size="sm" onClick={() => setFilter(EMPTY_FILTER)}>
            Reset filter
          </Button>
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* HP: kartu */}
      <ul className="grid gap-3 md:hidden">
        {visible.map((row) => (
          <li key={row.id} className="grid gap-3 rounded-xl border bg-card p-4">
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
              <Actions row={row} />
            </div>
            <div className="grid grid-cols-2 gap-2 [&>*:last-child]:col-span-2">
              <QuickSelects row={row} stages={stages} onUpdate={onUpdate} pending={pending} labelled />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: tabel */}
      <div className={visible.length ? "hidden rounded-xl border md:block" : "hidden"}>
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
