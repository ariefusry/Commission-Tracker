"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, Hourglass, Paintbrush, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveCommission, quickUpdate } from "@/app/[lang]/(admin)/commissions/actions";
import { AppSelect } from "@/components/app-select";
import { Actions, Deadline, Total, type CommissionRow } from "@/components/commissions/commission-list";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Status, StageOption } from "@/lib/commission";
import { orderBetween } from "@/lib/queue-order";
import type { QuickUpdate } from "@/lib/validators";

type ColumnKey = "waiting" | "working" | "done";
// Status yang bisa dituju lewat board (Batal hanya lewat form/daftar).
type BoardStatus = "queue" | "in_progress" | "revision" | "done";
type Move = { id: string; status: BoardStatus; queue_order: number };

const DONE_LIMIT = 10;
const COLUMN_KEYS: ColumnKey[] = ["waiting", "working", "done"];

const columnOf = (status: Status): ColumnKey | null =>
  status === "queue" ? "waiting" : status === "in_progress" || status === "revision" ? "working" : status === "done" ? "done" : null;

const byPriority = (a: CommissionRow, b: CommissionRow) => a.queue_order - b.queue_order || a.start_date.localeCompare(b.start_date);

function buildColumns(rows: CommissionRow[]): Record<ColumnKey, CommissionRow[]> {
  return {
    waiting: rows.filter((r) => r.status === "queue").sort(byPriority),
    working: rows.filter((r) => r.status === "in_progress" || r.status === "revision").sort(byPriority),
    done: rows.filter((r) => r.status === "done").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
  };
}

type CardProps = {
  row: CommissionRow;
  column: ColumnKey;
  stages: StageOption[];
  today: string;
  pending: boolean;
  slotFull: boolean;
  onUpdate: (update: QuickUpdate) => void;
  onMove: (status: BoardStatus) => void;
};

function CardBody({ row, column, stages, today, pending, slotFull, onUpdate, onMove, handle }: CardProps & { handle: React.ReactNode }) {
  const { t } = useDict();
  const stageOptions = stages
    .filter((s) => s.is_active || s.id === row.stage_id)
    .map((s) => ({ value: s.id, label: s.name }));

  return (
    <>
      <div className="flex items-start gap-1">
        {handle}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="grid min-w-0">
            <Link href={`/commissions/${row.id}`} className="truncate font-medium hover:underline">
              {row.client_username}
            </Link>
            <span className="text-xs text-muted-foreground">{row.type_name}</span>
          </div>
          <Total row={row} />
        </div>
      </div>

      {column !== "done" && (
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <AppSelect
            size="sm"
            aria-label={`${t.commissions.stage} ${row.client_username}`}
            value={row.stage_id}
            disabled={pending}
            onValueChange={(value) => value !== row.stage_id && onUpdate({ field: "stage_id", value })}
            options={stageOptions}
          />
          {column === "working" && (
            <AppSelect
              size="sm"
              className="w-28"
              aria-label={`${t.commissions.status} ${row.client_username}`}
              value={row.status}
              disabled={pending}
              onValueChange={(value) =>
                value !== row.status && onUpdate({ field: "status", value: value as "in_progress" | "revision" })
              }
              options={[
                { value: "in_progress", label: t.status.in_progress },
                { value: "revision", label: t.status.revision },
              ]}
            />
          )}
        </div>
      )}

      <div className="flex items-end justify-between gap-2 text-sm">
        <Deadline row={row} today={today} />
        <Actions row={row} />
      </div>

      {column === "waiting" && (
        <Button
          size="sm"
          variant={slotFull ? "outline" : "default"}
          disabled={pending}
          title={slotFull ? t.board.slotFullHint : undefined}
          onClick={() => onMove("in_progress")}
        >
          <Play /> {slotFull ? t.board.startFull : t.board.start}
        </Button>
      )}
      {column === "working" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => onMove("done")}>
          <CheckCircle2 /> {t.board.finish}
        </Button>
      )}
      {column === "done" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => onMove("in_progress")}>
          <RotateCcw /> {t.board.reopen}
        </Button>
      )}
    </>
  );
}

const CARD_CLASS = "grid gap-3 rounded-lg border bg-card p-3 shadow-xs";

function SortableCard(props: CardProps) {
  const { t } = useDict();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.row.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${CARD_CLASS} ${isDragging ? "opacity-40" : ""}`}
    >
      <CardBody
        {...props}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={t.board.drag(props.row.client_username)}
            className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </li>
  );
}

const COLUMNS = [
  { key: "waiting", icon: Hourglass, empty: "emptyWaiting" },
  { key: "working", icon: Paintbrush, empty: "emptyWorking" },
  { key: "done", icon: CheckCircle2, empty: "emptyDone" },
] as const;

function Column({ id, highlight, children }: { id: ColumnKey; highlight: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`grid min-h-24 content-start gap-2 rounded-lg transition-colors ${highlight ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}>
      {children}
    </div>
  );
}

/**
 * Board ala Trello: Waiting list → Sedang dikerjakan → Selesai.
 * Kartu bisa digeser (pegangan ⋮⋮) untuk mengurutkan prioritas atau pindah kolom.
 * Urutan (queue_order) juga dipakai halaman tracking client.
 */
export function CommissionBoard({
  data,
  stages,
  today,
  slotLimit,
}: {
  data: CommissionRow[];
  stages: StageOption[];
  today: string;
  slotLimit: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mobileColumn, setMobileColumn] = useState<ColumnKey>("working");
  const [suggest, setSuggest] = useState<CommissionRow | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnKey | null>(null);
  const { t } = useDict();

  // Tampilkan hasil geser segera; otomatis kembali jika server gagal.
  const [rows, applyMove] = useOptimistic(data, (current: CommissionRow[], m: Move) =>
    current.map((r) =>
      r.id === m.id
        ? { ...r, status: m.status, queue_order: m.queue_order, completed_at: m.status === "done" ? new Date().toISOString() : null }
        : r,
    ),
  );

  const columns = buildColumns(rows);
  const doneTotal = columns.done.length;
  const slotFull = columns.working.length >= slotLimit;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const offerNext = (movedId: string, working: number) => {
    const next = columns.waiting.find((r) => r.id !== movedId);
    if (next && working < slotLimit) setSuggest(next);
  };

  const commit = (row: CommissionRow, status: BoardStatus, queueOrder: number) => {
    setSuggest(null);
    const leftWorking = columnOf(row.status) === "working" && columnOf(status) !== "working";
    startTransition(async () => {
      applyMove({ id: row.id, status, queue_order: queueOrder });
      const result = await moveCommission(row.id, { status, queue_order: queueOrder });
      setError(result.error ?? null);
      if (!result.error && leftWorking && status === "done") offerNext(row.id, columns.working.length - 1);
    });
  };

  /** Tombol "Mulai/Selesai/Buka lagi": taruh di ujung bawah kolom tujuan. */
  const moveByButton = (row: CommissionRow) => (status: BoardStatus) => {
    const target = columns[columnOf(status)!].filter((r) => r.id !== row.id);
    commit(row, status, orderBetween(target.at(-1)?.queue_order, undefined));
  };

  const update = (id: string) => (u: QuickUpdate) =>
    startTransition(async () => {
      const result = await quickUpdate(id, u);
      setError(result.error ?? null);
    });

  const findColumn = (id: string): ColumnKey | null => {
    if ((COLUMN_KEYS as string[]).includes(id)) return id as ColumnKey;
    const row = rows.find((r) => r.id === id);
    return row ? columnOf(row.status) : null;
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const onDragOver = ({ over }: DragOverEvent) => setOverColumn(over ? findColumn(String(over.id)) : null);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setOverColumn(null);
    // Dilepas di atas dirinya sendiri: tanpa ini kartu terlempar ke bawah kolom.
    if (!over || over.id === active.id) return;
    const row = rows.find((r) => r.id === active.id);
    const toColumn = findColumn(String(over.id));
    if (!row || !toColumn) return;

    const fromColumn = columnOf(row.status);
    // Status kolom tujuan; Dikerjakan/Revisi tetap jika hanya diurutkan.
    const status: BoardStatus =
      toColumn === "waiting"
        ? "queue"
        : toColumn === "done"
          ? "done"
          : row.status === "revision"
            ? "revision"
            : "in_progress";

    const list = columns[toColumn].filter((r) => r.id !== row.id);
    let index = list.length; // jatuh di area kolom → paling bawah
    const overIndex = list.findIndex((r) => r.id === over.id);
    if (overIndex >= 0) {
      const oldIndex = columns[toColumn].findIndex((r) => r.id === row.id);
      // Dalam kolom yang sama: geser ke bawah → taruh setelah kartu tujuan.
      index = fromColumn === toColumn && oldIndex >= 0 && oldIndex <= overIndex ? overIndex + 1 : overIndex;
    }
    if (fromColumn === toColumn && columns[toColumn][index]?.id === row.id) return;

    const queueOrder =
      toColumn === "done" ? row.queue_order : orderBetween(list[index - 1]?.queue_order, list[index]?.queue_order);
    if (fromColumn === toColumn && queueOrder === row.queue_order) return;
    commit(row, status, queueOrder);
  };

  const active = activeId ? rows.find((r) => r.id === activeId) : null;
  const cardProps = (row: CommissionRow, column: ColumnKey) => ({
    row,
    column,
    stages,
    today,
    pending,
    slotFull,
    onUpdate: update(row.id),
    onMove: moveByButton(row),
  });

  return (
    <div className="grid gap-3">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {suggest && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm" role="status">
          <span>
            {t.board.slotFree} <span className="font-medium">{suggest.client_username}</span> {t.board.firstInLine}
          </span>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSuggest(null)}>
              {t.board.later}
            </Button>
            <Button size="sm" disabled={pending} onClick={() => moveByButton(suggest)("in_progress")}>
              <Play /> {t.board.startShort}
            </Button>
          </span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t.board.hintBefore} <GripVertical className="inline size-3.5 align-text-bottom" /> {t.board.hintAfter}
      </p>

      {/* Di bawah lg: satu kolom per tab. */}
      <Tabs value={mobileColumn} onValueChange={(v) => setMobileColumn(v as ColumnKey)} className="lg:hidden">
        <TabsList className="w-full">
          {COLUMNS.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>
              {t.board[c.key]} ({c.key === "working" ? `${columns.working.length}/${slotLimit}` : columns[c.key].length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setOverColumn(null); }}>
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          {COLUMNS.map(({ key, icon: Icon, empty }) => {
            const title = t.board[key];
            const items = key === "done" ? columns.done.slice(0, DONE_LIMIT) : columns[key];
            return (
              <section
                key={key}
                aria-label={title}
                className={`grid content-start gap-3 rounded-xl bg-muted/50 p-3 ${key === mobileColumn ? "" : "hidden lg:grid"}`}
              >
                <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
                  <Icon className="size-4 text-muted-foreground" />
                  {title}
                  <span className={`font-normal ${key === "working" && slotFull ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                    ({key === "working" ? `${columns.working.length}/${slotLimit} ${t.board.slot}` : key === "done" ? doneTotal : items.length})
                  </span>
                </h2>
                <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <Column id={key} highlight={overColumn === key && findColumn(activeId ?? "") !== key}>
                    {items.length === 0 ? (
                      <p className="px-1 py-4 text-sm text-muted-foreground">{t.board[empty]}</p>
                    ) : (
                      <ul className="grid gap-2">
                        {items.map((row) => (
                          <SortableCard key={row.id} {...cardProps(row, key)} />
                        ))}
                      </ul>
                    )}
                  </Column>
                </SortableContext>
                {key === "done" && doneTotal > DONE_LIMIT && (
                  <p className="px-1 text-xs text-muted-foreground">
                    {t.board.doneLimited(DONE_LIMIT, doneTotal)}
                  </p>
                )}
              </section>
            );
          })}
        </div>
        <DragOverlay>
          {active ? (
            <div className={`${CARD_CLASS} rotate-1 shadow-lg`}>
              <CardBody
                {...cardProps(active, columnOf(active.status) ?? "working")}
                handle={<GripVertical className="mt-0.5 size-4 text-muted-foreground" />}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
