"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { quickUpdate } from "@/app/(admin)/commissions/actions";
import { DeleteCommissionButton } from "@/components/commissions/delete-commission-button";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  PAYMENT_LABEL,
  PAYMENT_STATUSES,
  STAGE_LABEL,
  STAGES,
  STATUS_LABEL,
  STATUSES,
  type PaymentStatus,
  type Stage,
  type Status,
} from "@/lib/commission";
import { formatDate, formatRupiah } from "@/lib/format";
import type { QuickUpdate } from "@/lib/validators";

export type CommissionRow = {
  id: string;
  client_username: string;
  type_name: string;
  deadline: string | null;
  stage: Stage;
  stage_custom: string | null;
  status: Status;
  payment_status: PaymentStatus;
  dp_amount: number;
  price_total: number;
};

type OnUpdate = (id: string, update: QuickUpdate) => void;

function InlineSelect<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  customLabel?: string | null;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <NativeSelect
      size="sm"
      aria-label={props.label}
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value as T)}
    >
      {props.options.map((o) => (
        <NativeSelectOption key={o} value={o}>
          {o === props.value && props.customLabel ? props.customLabel : props.labels[o]}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, CommissionRow>();

function buildColumns(onUpdate: OnUpdate, pending: boolean) {
  return helper.columns([
    helper.accessor("client_username", {
      header: "Client",
      cell: ({ row }) => (
        <Link href={`/commissions/${row.original.id}`} className="font-medium underline-offset-4 hover:underline">
          {row.original.client_username}
        </Link>
      ),
    }),
    helper.accessor("type_name", { header: "Tipe" }),
    helper.accessor("deadline", { header: "Deadline", cell: ({ getValue }) => formatDate(getValue()) }),
    helper.accessor("stage", {
      header: "Tahap",
      cell: ({ row }) => (
        <InlineSelect
          label={`Tahap ${row.original.client_username}`}
          value={row.original.stage}
          options={STAGES}
          labels={STAGE_LABEL}
          customLabel={row.original.stage === "custom" ? row.original.stage_custom : null}
          disabled={pending}
          onChange={(value) => onUpdate(row.original.id, { field: "stage", value })}
        />
      ),
    }),
    helper.accessor("status", {
      header: "Status",
      cell: ({ row }) => (
        <InlineSelect
          label={`Status ${row.original.client_username}`}
          value={row.original.status}
          options={STATUSES}
          labels={STATUS_LABEL}
          disabled={pending}
          onChange={(value) => onUpdate(row.original.id, { field: "status", value })}
        />
      ),
    }),
    helper.accessor("payment_status", {
      header: "Bayar",
      cell: ({ row }) => (
        <InlineSelect
          label={`Pembayaran ${row.original.client_username}`}
          value={row.original.payment_status}
          options={PAYMENT_STATUSES}
          labels={PAYMENT_LABEL}
          customLabel={
            row.original.payment_status === "dp" ? `DP ${formatRupiah(row.original.dp_amount)}` : null
          }
          disabled={pending}
          onChange={(value) => onUpdate(row.original.id, { field: "payment_status", value })}
        />
      ),
    }),
    helper.accessor("price_total", {
      header: "Total",
      cell: ({ getValue }) => <span className="tabular-nums">{formatRupiah(getValue())}</span>,
    }),
    helper.display({
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/commissions/${row.original.id}`} />}>
            Edit
          </Button>
          <DeleteCommissionButton id={row.original.id} name={row.original.client_username} />
        </div>
      ),
    }),
  ]);
}

export function CommissionTable({ data }: { data: CommissionRow[] }) {
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
  const columns = useMemo(() => buildColumns(onUpdate, pending), [onUpdate, pending]);
  const table = useTable({ features, columns, data });

  return (
    <div className="grid gap-3">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="rounded-lg border">
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
