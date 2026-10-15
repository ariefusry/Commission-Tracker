"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calculator,
  ChartColumn,
  ChartNoAxesColumn,
  CheckCircle2,
  ClipboardList,
  Clock,
  Coins,
  Hourglass,
  Minus,
  Table2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppSelect } from "@/components/app-select";
import type { CommissionRow } from "@/components/commissions/commission-list";
import { RevenueChart, TypeChart, type RevenueMetric, type TypeMetric } from "@/components/dashboard/charts";
import { useDict } from "@/components/i18n-provider";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deadlineInfo, deadlineLabel } from "@/lib/deadline";
import { formatDate, formatPeriodKey, formatRupiah } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { amountDue } from "@/lib/pricing";
import {
  addDays,
  filterByRange,
  isIsoDate,
  needsAttention,
  percentChange,
  PERIODS,
  previousRange,
  resolveRange,
  revenueSeries,
  statusCounts,
  summarize,
  typeDistribution,
  workPace,
  type DateRange,
  type Period,
  type SeriesPoint,
  type StatOptions,
} from "@/lib/stats";

function rangeLabel({ from, to }: DateRange, t: Dict) {
  const date = (d: string | null) => formatDate(d, t.intl);
  if (!from && !to) return t.dashboard.allDates;
  if (from && to) return from === to ? date(from) : `${date(from)} – ${date(to)}`;
  return from ? t.dashboard.since(date(from)) : t.dashboard.until(date(to));
}

/** `YYYY-MM` → hari terakhir bulan itu. */
const monthEnd = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return addDays(new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10), -1);
};

/** Naik/turun dibanding periode sebelumnya: ikon + teks, bukan warna saja. */
function Delta({ pct, t }: { pct: number | null | undefined; t: Dict }) {
  if (pct === undefined || pct === null) return null;
  const Icon = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  const tone = pct > 0 ? "text-emerald-700 dark:text-emerald-400" : pct < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground";
  return (
    <span className={`flex items-center gap-1 text-xs ${tone}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {pct === 0 ? t.dashboard.samePrevious : t.dashboard.vsPrevious(pct)}
    </span>
  );
}

/** Tren kecil di kartu angka: satu garis, tanpa sumbu (detailnya di grafik utama). */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const max = Math.max(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${26 - (v / max) * 22}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-1 h-7 w-full" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--chart-accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  note,
  tone,
  delta,
  trend,
  t,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  note?: string;
  tone?: "good" | "warn";
  delta?: number | null;
  trend?: number[];
  t: Dict;
}) {
  const color = tone === "good" ? "text-emerald-700 dark:text-emerald-400" : tone === "warn" ? "text-amber-700 dark:text-amber-400" : "";
  return (
    <div className="grid h-full content-start gap-1 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
          <Icon className="size-4" />
        </span>
      </div>
      <span className={`text-xl font-semibold sm:text-2xl ${color}`}>{value}</span>
      {/* Baris catatan selalu ada agar tinggi kartu tidak berubah antar periode. */}
      <span className="min-h-4 text-xs text-muted-foreground">{note}</span>
      <Delta pct={delta} t={t} />
      {trend && <Sparkline values={trend} />}
    </div>
  );
}

function Panel({
  title,
  note,
  actions,
  children,
}: {
  title: string;
  note?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid content-start gap-3 rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 className="font-semibold">{title}</h2>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Pilihan kecil 2-3 opsi (mis. Pendapatan / Jumlah). */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: typeof Table2 }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="xs"
          variant={value === o.value ? "outline" : "ghost"}
          aria-pressed={value === o.value}
          className={value === o.value ? "bg-background shadow-xs" : "text-muted-foreground"}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <o.icon />}
          {o.label}
        </Button>
      ))}
    </div>
  );
}

/** Tabel kembaran grafik: kolom mengikuti metrik yang dipilih. */
function RevenueTable({ points, metric, t }: { points: SeriesPoint[]; metric: RevenueMetric; t: Dict }) {
  const revenue = metric === "revenue";
  return (
    <div className="max-h-64 overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t.dashboard.periodColumn}</th>
            {revenue ? (
              <>
                <th className="px-3 py-2 text-right font-medium">{t.dashboard.paid}</th>
                <th className="px-3 py-2 text-right font-medium">{t.dashboard.due}</th>
                <th className="px-3 py-2 text-right font-medium">{t.common.total}</th>
              </>
            ) : (
              <th className="px-3 py-2 text-right font-medium">{t.dashboard.countColumn}</th>
            )}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {points.map((p) => (
            <tr key={p.key} className="border-t">
              <td className="px-3 py-1.5">{formatPeriodKey(p.key, t.intl)}</td>
              {revenue ? (
                <>
                  <td className="px-3 py-1.5 text-right">{formatRupiah(p.paid)}</td>
                  <td className="px-3 py-1.5 text-right">{formatRupiah(p.due)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{formatRupiah(p.paid + p.due)}</td>
                </>
              ) : (
                <td className="px-3 py-1.5 text-right">{p.count}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ATTENTION_LIMIT = 4;

function AttentionGroup({
  title,
  icon: Icon,
  tone,
  rows,
  detail,
  t,
}: {
  title: string;
  icon: typeof Clock;
  tone: string;
  rows: CommissionRow[];
  detail: (r: CommissionRow) => string | null;
  t: Dict;
}) {
  if (!rows.length) return null;
  return (
    <div className="grid gap-1.5">
      <h3 className={`flex items-center gap-1.5 text-sm font-medium ${tone}`}>
        <Icon className="size-4" aria-hidden /> {title}
        <span className="font-normal text-muted-foreground">({rows.length})</span>
      </h3>
      <ul className="grid gap-1">
        {rows.slice(0, ATTENTION_LIMIT).map((r) => (
          <li key={r.id}>
            <Link
              href={`/commissions/${r.id}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <span className="grid min-w-0">
                <span className="truncate font-medium">{r.client_username}</span>
                <span className="truncate text-xs text-muted-foreground">{r.type_name}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{detail(r)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > ATTENTION_LIMIT && (
        <Link href="/commissions" className="px-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
          {t.dashboard.more(rows.length - ATTENTION_LIMIT)}
        </Link>
      )}
    </div>
  );
}

function Attention({ all, today, t }: { all: CommissionRow[]; today: string; t: Dict }) {
  const a = needsAttention(all, today);
  const deadline = (r: CommissionRow) => deadlineLabel(deadlineInfo(r.deadline, r.status, today), t);
  const empty = !a.late.length && !a.soon.length && !a.unpaid.length;
  return (
    <Panel title={t.dashboard.attention} note={t.dashboard.attentionNote}>
      {empty ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> {t.dashboard.allClear}
        </p>
      ) : (
        <div className="grid gap-4">
          <AttentionGroup title={t.dashboard.late} icon={AlertTriangle} tone="text-destructive" rows={a.late} detail={deadline} t={t} />
          <AttentionGroup title={t.dashboard.soon} icon={Clock} tone="text-amber-700 dark:text-amber-400" rows={a.soon} detail={deadline} t={t} />
          <AttentionGroup
            title={t.dashboard.unpaidDone}
            icon={Wallet}
            tone=""
            rows={a.unpaid}
            detail={(r) => t.commissions.due(formatRupiah(amountDue(r.price_total, r.payment_status, r.dp_amount)))}
            t={t}
          />
        </div>
      )}
    </Panel>
  );
}

// Tahap berurutan → ramp satu hue (terang = awal, gelap = selesai). Batal di luar pipeline.
const PIPELINE = [
  { status: "queue", color: "var(--chart-stage-1)" },
  { status: "in_progress", color: "var(--chart-stage-2)" },
  { status: "revision", color: "var(--chart-stage-3)" },
  { status: "done", color: "var(--chart-stage-4)" },
] as const;

function WorkStatus({ rows, t }: { rows: CommissionRow[]; t: Dict }) {
  const counts = statusCounts(rows);
  const total = PIPELINE.reduce((sum, p) => sum + counts[p.status], 0);
  const pace = workPace(rows);
  return (
    <Panel title={t.dashboard.workStatus}>
      {total > 0 && (
        // Satu batang = seluruh commission aktif; segmen dipisah celah 2px.
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={PIPELINE.map((p) => `${t.status[p.status]} ${counts[p.status]}`).join(", ")}>
          {PIPELINE.filter((p) => counts[p.status] > 0).map((p) => (
            <span key={p.status} className="h-full" style={{ flexGrow: counts[p.status], background: p.color }} title={`${t.status[p.status]}: ${counts[p.status]}`} />
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {PIPELINE.map((p) => (
          <li key={p.status} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="truncate text-muted-foreground">{t.status[p.status]}</span>
            <span className="ml-auto font-medium tabular-nums">{counts[p.status]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm border border-dashed border-muted-foreground" aria-hidden />
          <span className="truncate text-muted-foreground">{t.status.cancelled}</span>
          <span className="ml-auto font-medium tabular-nums">{counts.cancelled}</span>
        </li>
      </ul>
      <dl className="grid grid-cols-2 gap-3 border-t pt-3">
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted-foreground">{t.dashboard.avgWork}</dt>
          <dd className="font-semibold">{pace.avgDays === null ? t.dashboard.noData : t.dashboard.days(pace.avgDays)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted-foreground">{t.dashboard.onTime}</dt>
          <dd className="font-semibold">{pace.onTimePct === null ? t.dashboard.noData : `${pace.onTimePct}%`}</dd>
        </div>
      </dl>
    </Panel>
  );
}

type Props = {
  rows: CommissionRow[];
  today: string;
  options: StatOptions;
  initial: { period: Period; from: string; to: string; type: string };
};

/**
 * Semua perhitungan di browser dari data yang sudah dimuat: ganti periode/tipe instan,
 * tanpa memuat ulang halaman. URL ikut diperbarui agar bisa di-bookmark.
 */
export function DashboardView({ rows: all, today, options, initial }: Props) {
  const { t } = useDict();
  const [period, setPeriod] = useState<Period>(initial.period);
  const [from, setFrom] = useState(initial.from || `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(initial.to || today);
  const [type, setType] = useState(initial.type);
  const [metric, setMetric] = useState<RevenueMetric>("revenue");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [typeMetric, setTypeMetric] = useState<TypeMetric>("count");

  const sync = (next: { period?: Period; from?: string; to?: string; type?: string }) => {
    const s = { period, from, to, type, ...next };
    const q = new URLSearchParams({ period: s.period });
    if (s.period === "custom") {
      if (isIsoDate(s.from)) q.set("from", s.from);
      if (isIsoDate(s.to)) q.set("to", s.to);
    }
    if (s.type) q.set("type", s.type);
    window.history.replaceState(null, "", `?${q}`);
  };
  const changeType = (v: string) => {
    setType(v);
    sync({ type: v });
  };

  const typeNames = [...new Set(all.map((r) => r.type_name))].sort();
  const scoped = type ? all.filter((r) => r.type_name === type) : all;
  const range = resolveRange(period, today, { from, to });
  const rows = filterByRange(scoped, range);
  const s = summarize(rows, options);
  const prev = previousRange(range, today);
  const p = prev ? summarize(filterByRange(scoped, prev), options) : null;
  const series = revenueSeries(rows, range, today, options);
  const types = typeDistribution(filterByRange(all, range));
  const late = rows.filter((r) => deadlineInfo(r.deadline, r.status, today).tone === "late").length;

  const drill = (key: string) => {
    if (key.length !== 7) return; // hanya batang bulanan
    const end = monthEnd(key) < today ? monthEnd(key) : today;
    setPeriod("custom");
    setFrom(`${key}-01`);
    setTo(end);
    sync({ period: "custom", from: `${key}-01`, to: end });
  };

  return (
    <>
      {/* Satu baris filter untuk semua isi di bawahnya. */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={period}
            onValueChange={(v) => {
              setPeriod(v as Period);
              sync({ period: v as Period });
            }}
          >
            <TabsList aria-label={t.dashboard.period}>
              {PERIODS.map((pd) => (
                <TabsTrigger key={pd} value={pd} className="px-3">
                  <span className="sm:hidden">{t.periods.short[pd]}</span>
                  <span className="hidden sm:inline">{t.periods.label[pd]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label={t.dashboard.from}
                className="w-auto"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  sync({ from: e.target.value });
                }}
              />
              <span className="text-sm text-muted-foreground">–</span>
              <Input
                type="date"
                aria-label={t.dashboard.to}
                className="w-auto"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  sync({ to: e.target.value });
                }}
              />
            </div>
          )}
          <div className="flex items-center gap-1">
            <AppSelect
              className="w-40"
              aria-label={t.dashboard.typeFilter}
              value={type}
              onValueChange={changeType}
              options={[{ value: "", label: t.dashboard.allTypes }, ...typeNames.map((n) => ({ value: n, label: n }))]}
            />
            {type && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t.dashboard.clearType} title={t.dashboard.clearType} onClick={() => changeType("")}>
                <X />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {rangeLabel(range, t)}
          {type && ` · ${type}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          t={t}
          icon={ClipboardList}
          label={t.dashboard.commissions}
          value={String(s.count)}
          trend={series.points.map((pt) => pt.count)}
          note={[s.cancelled ? t.dashboard.cancelledCount(s.cancelled) : null, late ? t.dashboard.lateCount(late) : null].filter(Boolean).join(" · ")}
          delta={p && percentChange(s.count, p.count)}
        />
        <Stat
          t={t}
          icon={Coins}
          label={t.dashboard.revenue}
          value={formatRupiah(s.orderValue)}
          trend={series.points.map((pt) => pt.paid + pt.due)}
          note={t.dashboard.orderValue}
          delta={p && percentChange(s.orderValue, p.orderValue)}
        />
        <Stat
          t={t}
          icon={Wallet}
          label={t.dashboard.paid}
          value={formatRupiah(s.paid)}
          trend={series.points.map((pt) => pt.paid)}
          tone="good"
          note={s.cancelledPaid ? t.dashboard.paidFromCancelled(formatRupiah(s.cancelledPaid)) : undefined}
          delta={p && percentChange(s.paid, p.paid)}
        />
        <Stat t={t} icon={Hourglass} label={t.dashboard.due} value={formatRupiah(s.due)} tone={s.due > 0 ? "warn" : undefined} />
        <div className="col-span-2 lg:col-span-1">
          <Stat t={t} icon={Calculator} label={t.dashboard.average} value={formatRupiah(s.average)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {rows.length === 0 ? (
          <StateMessage icon={ChartNoAxesColumn} title={t.dashboard.emptyTitle} description={t.dashboard.emptyBody}>
            <Button variant="outline" nativeButton={false} render={<Link href="/commissions/new" />}>
              {t.dashboard.addCommission}
            </Button>
          </StateMessage>
        ) : (
          <Panel
            title={
              metric === "count"
                ? t.dashboard.commissions
                : series.granularity === "day"
                  ? t.dashboard.perDay
                  : t.dashboard.perMonth
            }
            note={[
              // Mode Jumlah tidak menghitung commission batal sama sekali.
              metric === "revenue" && options.countCancelledPaid ? t.dashboard.noteCountCancelled : t.dashboard.noteSkipCancelled,
              series.granularity === "month" && view === "chart" ? t.dashboard.drillHint : null,
            ]
              .filter(Boolean)
              .join(" ")}
            actions={
              <div className="flex flex-wrap gap-2">
                <Segmented
                  label={t.dashboard.chartView}
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: "revenue", label: t.dashboard.metricRevenue },
                    { value: "count", label: t.dashboard.metricCount },
                  ]}
                />
                <Segmented
                  label={t.dashboard.chartView}
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "chart", label: t.dashboard.showChart, icon: ChartColumn },
                    { value: "table", label: t.dashboard.showTable, icon: Table2 },
                  ]}
                />
              </div>
            }
          >
            {view === "chart" ? (
              <RevenueChart data={series.points} metric={metric} onSelect={series.granularity === "month" ? drill : undefined} />
            ) : (
              <RevenueTable points={series.points} metric={metric} t={t} />
            )}
          </Panel>
        )}
        <Attention all={all} today={today} t={t} />
      </div>

      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <WorkStatus rows={rows} t={t} />
          <Panel
            title={t.dashboard.typeDistribution}
            note={t.dashboard.typeHint}
            actions={
              <Segmented
                label={t.dashboard.typeDistribution}
                value={typeMetric}
                onChange={setTypeMetric}
                options={[
                  { value: "count", label: t.dashboard.metricCount },
                  { value: "revenue", label: t.dashboard.metricRevenue },
                ]}
              />
            }
          >
            <TypeChart data={types} metric={typeMetric} selected={type} onSelect={(v) => changeType(v === type ? "" : v)} />
          </Panel>
        </div>
      )}
    </>
  );
}
