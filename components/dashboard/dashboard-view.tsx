"use client";

import { ChartNoAxesColumn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { CommissionRow } from "@/components/commissions/commission-list";
import { RevenueChart, TypeChart } from "@/components/dashboard/charts";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deadlineInfo } from "@/lib/deadline";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  filterByRange,
  isIsoDate,
  PERIOD_LABEL,
  PERIOD_SHORT,
  PERIODS,
  resolveRange,
  revenueSeries,
  summarize,
  typeDistribution,
  type DateRange,
  type Period,
  type StatOptions,
} from "@/lib/stats";

function rangeLabel({ from, to }: DateRange) {
  if (!from && !to) return "Semua tanggal";
  if (from && to) return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
  return from ? `Sejak ${formatDate(from)}` : `Sampai ${formatDate(to)}`;
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" | "warn" }) {
  const color = tone === "good" ? "text-emerald-700 dark:text-emerald-400" : tone === "warn" ? "text-amber-700 dark:text-amber-400" : "";
  return (
    <div className="grid content-start gap-1 rounded-xl border bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-xl font-semibold tabular-nums sm:text-2xl ${color}`}>{value}</span>
      {/* Baris catatan selalu ada agar tinggi kartu tidak berubah antar periode. */}
      <span className="min-h-4 text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="grid gap-0.5">
        <h2 className="font-semibold">{title}</h2>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

type Props = {
  rows: CommissionRow[];
  today: string;
  options: StatOptions;
  initial: { period: Period; from: string; to: string };
};

/**
 * Semua perhitungan di browser dari data yang sudah dimuat: ganti periode instan,
 * tanpa memuat ulang halaman. URL ikut diperbarui agar bisa di-bookmark.
 */
export function DashboardView({ rows: all, today, options, initial }: Props) {
  const [period, setPeriod] = useState<Period>(initial.period);
  const [from, setFrom] = useState(initial.from || `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(initial.to || today);

  const syncUrl = (p: Period, f: string, t: string) => {
    const q = new URLSearchParams({ period: p });
    if (p === "custom") {
      if (isIsoDate(f)) q.set("from", f);
      if (isIsoDate(t)) q.set("to", t);
    }
    window.history.replaceState(null, "", `?${q}`);
  };

  const range = resolveRange(period, today, { from, to });
  const rows = filterByRange(all, range);
  const s = summarize(rows, options);
  const series = revenueSeries(rows, range, today, options);
  const types = typeDistribution(rows);
  const late = rows.filter((r) => deadlineInfo(r.deadline, r.status, today).tone === "late").length;

  return (
    <>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={period}
            onValueChange={(v) => {
              setPeriod(v as Period);
              syncUrl(v as Period, from, to);
            }}
          >
            <TabsList aria-label="Periode">
              {PERIODS.map((p) => (
                <TabsTrigger key={p} value={p} className="px-3">
                  <span className="sm:hidden">{PERIOD_SHORT[p]}</span>
                  <span className="hidden sm:inline">{PERIOD_LABEL[p]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Dari tanggal"
                className="w-auto"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  syncUrl(period, e.target.value, to);
                }}
              />
              <span className="text-sm text-muted-foreground">–</span>
              <Input
                type="date"
                aria-label="Sampai tanggal"
                className="w-auto"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  syncUrl(period, from, e.target.value);
                }}
              />
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {rangeLabel(range)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Commission"
          value={String(s.count)}
          note={[s.cancelled ? `${s.cancelled} batal` : null, late ? `${late} terlambat` : null].filter(Boolean).join(" · ")}
        />
        <Stat label="Total pendapatan" value={formatRupiah(s.orderValue)} note="Nilai order" />
        <Stat
          label="Sudah dibayar"
          value={formatRupiah(s.paid)}
          tone="good"
          note={s.cancelledPaid ? `Termasuk ${formatRupiah(s.cancelledPaid)} dari batal` : undefined}
        />
        <Stat label="Belum dibayar" value={formatRupiah(s.due)} tone={s.due > 0 ? "warn" : undefined} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label="Rata-rata harga" value={formatRupiah(s.average)} />
        </div>
      </div>

      {rows.length === 0 ? (
        <StateMessage
          icon={ChartNoAxesColumn}
          title="Belum ada commission di periode ini"
          description="Pilih periode lain atau tambah commission baru."
        >
          <Button variant="outline" nativeButton={false} render={<Link href="/commissions/new" />}>
            Tambah commission
          </Button>
        </StateMessage>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            title={series.granularity === "day" ? "Pendapatan per hari" : "Pendapatan per bulan"}
            note={
              options.countCancelledPaid
                ? "Berdasarkan tanggal mulai. DP dari commission batal dihitung sebagai dibayar."
                : "Berdasarkan tanggal mulai. Commission batal tidak dihitung."
            }
          >
            <RevenueChart data={series.points} />
          </Panel>
          <Panel title="Distribusi tipe">
            <TypeChart data={types} />
          </Panel>
        </div>
      )}
    </>
  );
}
