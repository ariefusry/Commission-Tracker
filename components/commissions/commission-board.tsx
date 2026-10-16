"use client";

import {
  closestCorners,
  pointerWithin,
  DndContext,
  type CollisionDetection,
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
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, ChevronDown, GripVertical, Hourglass, Paintbrush, Play, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { moveCommission } from "@/app/[lang]/(admin)/commissions/actions";
import { AppSelect } from "@/components/app-select";
import { CopyTrackingLink } from "@/components/commissions/copy-tracking-link";
import { Deadline, DeleteButton, EditLink, Total, useQuickUpdate, type CommissionRow } from "@/components/commissions/commission-list";
import { useDict } from "@/components/i18n-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Status, StageOption } from "@/lib/commission";
import { orderBetween } from "@/lib/queue-order";
import { FLAGS, setFlag, useFlag } from "@/lib/stored-flag";
import type { QuickUpdate } from "@/lib/validators";

type ColumnKey = "waiting" | "working" | "done";
// Status yang bisa dituju lewat board (Batal hanya lewat form/daftar).
type BoardStatus = "queue" | "in_progress" | "revision" | "done";
type Move = { id: string; status: BoardStatus; queue_order: number };

const DONE_LIMIT = 10;
const COLUMN_KEYS: ColumnKey[] = ["waiting", "working", "done"];

const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// Getar singkat saat kartu diangkat/ditaruh (Android; iOS tidak mendukung Vibration API).
const haptic = () => navigator.vibrate?.(8);
// Kartu kembali ke tempatnya: spring tanpa pantulan (dekati damping 1.0).
const DROP_ANIMATION = { duration: 220, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" };

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
  const stageName = stages.find((s) => s.id === row.stage_id)?.name;

  const selects = column !== "done" && (
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
            value === "queue"
              ? onMove("queue")
              : value !== row.status && onUpdate({ field: "status", value: value as "in_progress" | "revision" })
          }
          options={[
            { value: "in_progress", label: t.status.in_progress },
            { value: "revision", label: t.status.revision },
            // Satu-satunya jalan kembali ke antrean di HP (board HP satu kolom per halaman).
            { value: "queue", label: t.status.queue },
          ]}
        />
      )}
    </div>
  );

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

      {/* Desktop: dropdown langsung terlihat (kolom board lebar cukup). */}
      {selects && <div className="hidden lg:block">{selects}</div>}

      <div className="flex items-end justify-between gap-2 text-sm">
        <Deadline row={row} today={today} />
        <div className="flex justify-end">
          <CopyTrackingLink code={row.tracking_code} name={row.client_username} />
          <EditLink row={row} />
          {/* HP: hapus ada di balik "ubah cepat" (kecuali kolom Selesai yang tidak punya dropdown). */}
          <span className={selects ? "hidden lg:contents" : "contents"}>
            <DeleteButton row={row} />
          </span>
        </div>
      </div>

      {/* HP: ringkasan tahap/status; dropdown dan hapus satu tingkat lebih dalam. */}
      {selects && (
        <details className="disclosure group -mx-3 border-t lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm [&::-webkit-details-marker]:hidden">
            <span className="sr-only">{t.commissions.quickEdit}:</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {[stageName, column === "working" ? t.status[row.status] : null].filter(Boolean).join(" · ")}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
          </summary>
          <div className="grid gap-2 px-3 pb-1">
            {selects}
            <div className="flex justify-end">
              <DeleteButton row={row} />
            </div>
          </div>
        </details>
      )}

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
            className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-0.5 pointer-coarse:p-3 text-muted-foreground hover:bg-muted active:cursor-grabbing"
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

/** Petunjuk geser kartu: tampil sampai ditutup, lalu diingat di perangkat ini. */
function BoardHint() {
  const { t } = useDict();
  // Server dan render pertama: anggap sudah ditutup, agar tidak berkedip muncul lalu hilang.
  const dismissed = useFlag(FLAGS.boardHintDismissed, true);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/50 py-1.5 pr-1 pl-3 text-xs text-muted-foreground">
      <p className="flex-1 py-1">
        {t.board.hintBefore} <GripVertical className="inline size-3.5 align-text-bottom" /> {t.board.hintAfter}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t.board.hintDismiss}
        onClick={() => setFlag(FLAGS.boardHintDismissed)}
      >
        <X />
      </Button>
    </div>
  );
}

/** Tab kolom di HP juga area drop: kartu bisa dipindah kolom walau kolomnya sedang tidak tampil. */
function DroppableTab({ column, highlight, children }: { column: ColumnKey; highlight: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `tab:${column}` });
  return (
    <TabsTrigger ref={setNodeRef} value={column} className={highlight ? "ring-2 ring-primary/30" : undefined}>
      {children}
    </TabsTrigger>
  );
}

// Area drop tersembunyi (kolom/tab di luar layar, display: none) berukuran 0 di pojok kiri atas dan bisa
// "menang" di closestCorners: abaikan. Tab kecil dicek dari posisi jari, bukan sudut kartu yang besar.
const boardCollision: CollisionDetection = (args) => {
  const visible = args.droppableContainers.filter((c) => (c.rect.current?.width ?? 0) > 0);
  const tab = pointerWithin({ ...args, droppableContainers: visible.filter((c) => String(c.id).startsWith("tab:")) });
  return tab.length ? tab : closestCorners({ ...args, droppableContainers: visible });
};

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
  const toast = useToast();
  const quickUpdate = useQuickUpdate(stages, startTransition);
  const [mobileColumn, setMobileColumn] = useState<ColumnKey>("working");
  // HP: kolom berjajar horizontal dengan scroll-snap (swipe + momentum bawaan browser); tab ikut posisi scroll.
  const pagerRef = useRef<HTMLDivElement>(null);
  const pageLeft = (pager: HTMLElement, column: ColumnKey) =>
    (pager.children[COLUMN_KEYS.indexOf(column)] as HTMLElement).offsetLeft - parseFloat(getComputedStyle(pager).paddingLeft);
  const goTo = (column: ColumnKey) => {
    setMobileColumn(column);
    const pager = pagerRef.current;
    if (pager && pager.scrollWidth > pager.clientWidth)
      pager.scrollTo({ left: pageLeft(pager, column), behavior: reducedMotion() ? "auto" : "smooth" });
  };
  const onPagerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const pager = e.currentTarget;
    const nearest = COLUMN_KEYS.reduce((best, c) =>
      Math.abs(pageLeft(pager, c) - pager.scrollLeft) < Math.abs(pageLeft(pager, best) - pager.scrollLeft) ? c : best,
    );
    if (nearest !== mobileColumn) setMobileColumn(nearest);
  };
  // Mulai di kolom "Sedang dikerjakan" tanpa animasi (desktop: tidak bisa di-scroll, tidak berpengaruh).
  useEffect(() => {
    const pager = pagerRef.current;
    if (pager) pager.scrollLeft = pageLeft(pager, "working");
  }, []);
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

  /** Simpan posisi baru; toast "dipindah/diurutkan · Urungkan" kecuali ini sendiri hasil urungkan. */
  const commit = (row: CommissionRow, status: BoardStatus, queueOrder: number, isUndo = false) => {
    setSuggest(null);
    const from = columnOf(row.status);
    const to = columnOf(status);
    startTransition(async () => {
      applyMove({ id: row.id, status, queue_order: queueOrder });
      const result = await moveCommission(row.id, { status, queue_order: queueOrder });
      if (result.error) return toast({ message: result.error, tone: "error" });
      if (isUndo) return;
      toast({
        message: from === to ? t.toast.reordered(row.client_username) : t.toast.moved(row.client_username, t.board[to!]),
        action: {
          label: t.toast.undo,
          onClick: () => commit({ ...row, status, queue_order: queueOrder }, row.status as BoardStatus, row.queue_order, true),
        },
      });
      if (from === "working" && status === "done") offerNext(row.id, columns.working.length - 1);
    });
  };

  /** Tombol "Mulai/Selesai/Buka lagi": taruh di ujung bawah kolom tujuan. */
  const moveByButton = (row: CommissionRow) => (status: BoardStatus) => {
    const target = columns[columnOf(status)!].filter((r) => r.id !== row.id);
    commit(row, status, orderBetween(target.at(-1)?.queue_order, undefined));
  };


  const findColumn = (id: string): ColumnKey | null => {
    const key = id.startsWith("tab:") ? id.slice(4) : id;
    if ((COLUMN_KEYS as string[]).includes(key)) return key as ColumnKey;
    const row = rows.find((r) => r.id === id);
    return row ? columnOf(row.status) : null;
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    haptic();
  };
  const onDragOver = ({ over }: DragOverEvent) => {
    const column = over ? findColumn(String(over.id)) : null;
    setOverColumn(column);
    // Melayang di atas tab (HP): buka kolomnya, seperti folder spring-loaded.
    if (column && column !== mobileColumn && String(over?.id).startsWith("tab:")) goTo(column);
  };

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
    haptic();
    commit(row, status, queueOrder);
  };

  const active = activeId ? rows.find((r) => r.id === activeId) : null;

  // Pembaca layar: nama client dan nama kolom, bukan UUID (bawaan dnd-kit berbahasa Inggris).
  const nameOf = (id: UniqueIdentifier) => rows.find((r) => r.id === id)?.client_username ?? "";
  const columnTitle = (id: UniqueIdentifier) => {
    const column = findColumn(String(id));
    return column ? t.board[column] : "";
  };
  const accessibility = {
    screenReaderInstructions: { draggable: t.board.dragInstructions },
    announcements: {
      onDragStart: ({ active }: DragStartEvent) => t.board.pickedUp(nameOf(active.id)),
      onDragOver: ({ active, over }: DragOverEvent) =>
        !over
          ? t.board.notOver(nameOf(active.id))
          : over.id !== active.id && rows.some((r) => r.id === over.id)
            ? t.board.overCard(nameOf(active.id), nameOf(over.id), columnTitle(over.id))
            : t.board.overColumn(nameOf(active.id), columnTitle(over.id)),
      onDragEnd: ({ active, over }: DragEndEvent) =>
        over ? t.board.dropped(nameOf(active.id), columnTitle(over.id)) : t.board.cancelled(nameOf(active.id)),
      onDragCancel: ({ active }: DragEndEvent) => t.board.cancelled(nameOf(active.id)),
    },
  };
  const cardProps = (row: CommissionRow, column: ColumnKey) => ({
    row,
    column,
    stages,
    today,
    pending,
    slotFull,
    onUpdate: (u: QuickUpdate) => quickUpdate(row, u),
    onMove: moveByButton(row),
  });

  return (
    <div className="grid grid-cols-1 gap-3">
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
      <BoardHint />

      <DndContext
        id="commission-board"
        accessibility={accessibility}
        // Tepi kiri/kanan 10% saja yang menggulir ke kolom sebelah, agar mengurutkan vertikal tidak ikut pindah halaman.
        autoScroll={{ threshold: { x: 0.1, y: 0.2 } }}
        sensors={sensors} collisionDetection={boardCollision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setOverColumn(null); }}>
        {/* Di bawah lg: tab = indikator halaman kolom; ketuk untuk pindah, atau swipe kolomnya. */}
        <Tabs value={mobileColumn} onValueChange={(v) => goTo(v as ColumnKey)} className="lg:hidden">
          <TabsList className="w-full">
            {COLUMNS.map((c) => (
              <DroppableTab key={c.key} column={c.key} highlight={activeId !== null && overColumn === c.key}>
                {/* Label pendek + jumlah sebagai badge: muat di layar 360px. */}
                {t.board.tabs[c.key]}
                <span className="rounded-full bg-muted px-1.5 text-xs font-normal tabular-nums text-muted-foreground">
                  {c.key === "working" ? `${columns.working.length}/${slotLimit}` : columns[c.key].length}
                </span>
              </DroppableTab>
            ))}
          </TabsList>
        </Tabs>

        <div
          ref={pagerRef}
          onScroll={onPagerScroll}
          className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
        >
          {COLUMNS.map(({ key, icon: Icon, empty }) => {
            const title = t.board[key];
            const items = key === "done" ? columns.done.slice(0, DONE_LIMIT) : columns[key];
            return (
              <section
                key={key}
                aria-label={title}
                className="grid w-full shrink-0 snap-start snap-always content-start gap-3 rounded-xl bg-muted/50 p-3 lg:w-auto"
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
        <DragOverlay dropAnimation={reducedMotion() ? null : DROP_ANIMATION}>
          {active ? (
            // Terangkat: sedikit lebih besar + bayangan. Di HP diperkecil dari titik pegangan agar tab dan
            // kolom tujuan tetap terlihat di sekitar jari.
            <div className={`${CARD_CLASS} origin-top-left scale-[1.02] rotate-1 shadow-xl pointer-coarse:scale-[0.6] pointer-coarse:opacity-90`}>
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
