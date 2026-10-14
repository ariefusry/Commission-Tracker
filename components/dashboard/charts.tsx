"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatRupiah } from "@/lib/format";

const revenueConfig = {
  paid: { label: "Sudah dibayar", color: "oklch(0.6 0.13 163)" },
  due: { label: "Belum dibayar", color: "oklch(0.8 0.14 85)" },
} satisfies ChartConfig;

const compact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

export function RevenueChart({ data }: { data: { label: string; paid: number; due: number }[] }) {
  return (
    <ChartContainer config={revenueConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact.format(v)} />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value, name) => `${revenueConfig[name as keyof typeof revenueConfig]?.label ?? name}: ${formatRupiah(Number(value))}`} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={[0, 0, 4, 4]} maxBarSize={56} />
        <Bar dataKey="due" stackId="a" fill="var(--color-due)" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ChartContainer>
  );
}

const typeConfig = { count: { label: "Commission", color: "var(--chart-2)" } } satisfies ChartConfig;

export function TypeChart({ data }: { data: { type: string; count: number }[] }) {
  return (
    <ChartContainer config={typeConfig} className="aspect-auto w-full" style={{ height: Math.max(96, data.length * 40 + 16) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} width={96} />
        <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} maxBarSize={24} label={{ position: "right", className: "fill-foreground text-xs" }} />
      </BarChart>
    </ChartContainer>
  );
}
