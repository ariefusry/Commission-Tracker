"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis, type MouseHandlerDataParam } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useDict } from "@/components/i18n-provider";
import { formatPeriodKey, formatRupiah } from "@/lib/format";
import type { SeriesPoint } from "@/lib/stats";

export type RevenueMetric = "revenue" | "count";

// Spesifikasi mark (panduan dataviz): batang ≤ 24px, ujung data membulat 4px, baseline persegi.
const BAR_SIZE = 24;
// Klik mouse tidak perlu kotak fokus; fokus keyboard (focus-visible) tetap tampil.
const NO_MOUSE_FOCUS = "[&_:focus:not(:focus-visible)]:outline-none";

/** Baris tooltip: garis warna seri + nilai (tebal) + nama seri. */
function TooltipRow({ color, name, value }: { color: string; name: string; value: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="h-3 w-1 shrink-0 rounded-full" style={{ background: color }} />
      <span className="font-medium text-foreground tabular-nums">{value}</span>
      <span className="text-muted-foreground">{name}</span>
    </div>
  );
}

/**
 * Pendapatan (dibayar + belum, batang bertumpuk) atau jumlah commission (area, tren).
 * `onSelect` dipanggil saat kolom periode diklik (dipakai untuk zoom ke bulan itu).
 */
export function RevenueChart({
  data,
  metric,
  onSelect,
}: {
  data: SeriesPoint[];
  metric: RevenueMetric;
  onSelect?: (key: string) => void;
}) {
  const { t } = useDict();
  const config = {
    paid: { label: t.dashboard.paid, color: "var(--chart-paid)" },
    due: { label: t.dashboard.due, color: "var(--chart-due)" },
    count: { label: t.dashboard.commissions, color: "var(--chart-accent)" },
  } satisfies ChartConfig;
  const compact = new Intl.NumberFormat(t.intl, { notation: "compact", maximumFractionDigits: 1 });
  // Batang: klik per batang (juga jalan untuk tap di HP).
  const barClick = onSelect ? (entry: unknown) => onSelect((entry as { payload: SeriesPoint }).payload.key) : undefined;
  // Area tidak punya batang: klik kolom periode lewat status tooltip (mouse; tap di HP tidak terdeteksi Recharts).
  const areaClick = onSelect
    ? (state: MouseHandlerDataParam) => {
        if (state.activeLabel !== undefined) onSelect(String(state.activeLabel));
      }
    : undefined;
  const cursor = onSelect ? "pointer" : undefined;

  const common = { data, margin: { left: 4, right: 8, top: 8 } };
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="key" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(k: string) => formatPeriodKey(k, t.intl)} />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={44}
        allowDecimals={metric === "revenue"}
        tickFormatter={(v: number) => (metric === "revenue" ? compact.format(v) : String(v))}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelFormatter={(k) => formatPeriodKey(String(k), t.intl)}
            formatter={(value, name) => {
              const key = name as keyof typeof config;
              return (
                <TooltipRow
                  color={config[key]?.color ?? "currentColor"}
                  name={config[key]?.label ?? String(name)}
                  value={metric === "revenue" ? formatRupiah(Number(value)) : String(value)}
                />
              );
            }}
          />
        }
      />
    </>
  );

  return (
    <ChartContainer config={config} className={`aspect-auto h-64 w-full ${NO_MOUSE_FOCUS}`}>
      {metric === "revenue" ? (
        <BarChart {...common} barSize={BAR_SIZE}>
          {axes}
          <ChartLegend content={<ChartLegendContent />} />
          {/* Celah 2px warna permukaan di antara segmen; baseline persegi, ujung atas membulat. */}
          <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" stroke="var(--card)" strokeWidth={2} radius={0} activeBar={{ fillOpacity: 0.85 }} onClick={barClick} cursor={cursor} />
          <Bar dataKey="due" stackId="a" fill="var(--color-due)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} activeBar={{ fillOpacity: 0.85 }} onClick={barClick} cursor={cursor} />
        </BarChart>
      ) : (
        <AreaChart {...common} onClick={areaClick} className={onSelect ? "cursor-pointer" : undefined}>
          <defs>
            <linearGradient id="count-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {axes}
          <Area
            dataKey="count"
            type="monotone"
            stroke="var(--color-count)"
            strokeWidth={2}
            fill="url(#count-wash)"
            // Titik ≥ 8px dengan cincin 2px warna permukaan.
            dot={data.length <= 12 ? { r: 4, fill: "var(--color-count)", stroke: "var(--card)", strokeWidth: 2 } : false}
            activeDot={{ r: 6, fill: "var(--color-count)", stroke: "var(--card)", strokeWidth: 2 }}
          />
        </AreaChart>
      )}
    </ChartContainer>
  );
}

export type TypeMetric = "count" | "revenue";

const TYPE_LABEL_MAX = 14;
const shortLabel = (s: string) => (s.length > TYPE_LABEL_MAX ? `${s.slice(0, TYPE_LABEL_MAX - 1)}…` : s);

/** Jumlah / nilai order per tipe. Klik batang → filter dashboard; tipe terpilih ditonjolkan, sisanya abu-abu. */
export function TypeChart({
  data,
  metric,
  selected,
  onSelect,
}: {
  data: { type: string; count: number; revenue: number }[];
  metric: TypeMetric;
  selected: string;
  onSelect: (type: string) => void;
}) {
  const { t } = useDict();
  const config = {
    count: { label: t.dashboard.commissions, color: "var(--chart-accent)" },
    revenue: { label: t.dashboard.revenue, color: "var(--chart-accent)" },
  } satisfies ChartConfig;
  const compact = new Intl.NumberFormat(t.intl, { notation: "compact", maximumFractionDigits: 1 });
  const format = (v: number) => (metric === "revenue" ? compact.format(v) : String(v));
  const on = (type: string) => !selected || selected === type;

  return (
    <ChartContainer config={config} className={`aspect-auto w-full ${NO_MOUSE_FOCUS}`} style={{ height: Math.max(96, data.length * 40 + 16) }}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 40 }}
        barSize={BAR_SIZE}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} width={104} tickFormatter={shortLabel} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel={false}
              formatter={(value) => (
                <TooltipRow
                  color="var(--chart-accent)"
                  name={config[metric].label}
                  value={metric === "revenue" ? formatRupiah(Number(value)) : String(value)}
                />
              )}
            />
          }
        />
        {/* Baseline (kiri) persegi, ujung data membulat. */}
        <Bar
          dataKey={metric}
          radius={[0, 4, 4, 0]}
          activeBar={{ fillOpacity: 0.85 }}
          cursor="pointer"
          // Klik per batang (tidak bergantung pada status hover tooltip).
          onClick={(entry: unknown) => onSelect((entry as { payload: { type: string } }).payload.type)}
        >
          <LabelList dataKey={metric} position="right" className="fill-foreground" fontSize={12} formatter={(v: unknown) => format(Number(v))} />
          {data.map((d) => (
            <Cell key={d.type} fill={on(d.type) ? "var(--color-count)" : "var(--muted-foreground)"} fillOpacity={on(d.type) ? 1 : 0.3} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
