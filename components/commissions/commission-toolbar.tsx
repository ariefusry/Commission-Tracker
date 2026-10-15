"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { AppSelect } from "@/components/app-select";
import { useDict } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAYMENT_STATUSES, STATUSES } from "@/lib/commission";
import { activeFilterCount, EMPTY_FILTER, SORT_KEYS, type CommissionFilter, type SortKey } from "@/lib/commission-filter";
import { weekStart } from "@/lib/stats";

type Props = {
  filter: CommissionFilter;
  onFilter: (f: CommissionFilter) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  types: string[];
  today: string;
};

export function CommissionToolbar({ filter, onFilter, sort, onSort, types, today }: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useDict();
  const c = t.commissions;
  const set = <K extends keyof CommissionFilter>(key: K, value: CommissionFilter[K]) => onFilter({ ...filter, [key]: value });
  const extra = activeFilterCount({ ...filter, q: "" });
  const presets = [
    { label: c.today, from: today },
    { label: c.thisWeek, from: weekStart(today) },
    { label: c.thisMonth, from: `${today.slice(0, 7)}-01` },
  ];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={c.search}
            placeholder={c.search}
            className="pl-8"
            value={filter.q}
            onChange={(e) => set("q", e.target.value)}
          />
        </div>
        <AppSelect
          className="flex-1 sm:w-44 sm:flex-none"
          aria-label={c.sort}
          value={sort}
          onValueChange={(v) => onSort(v as SortKey)}
          options={SORT_KEYS.map((value) => ({ value, label: t.sorts[value] }))}
        />
        <Button
          type="button"
          variant={extra ? "secondary" : "outline"}
          aria-expanded={open}
          aria-controls="commission-filters"
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal />
          <span className="hidden sm:inline">{c.filter}</span>
          {extra > 0 && <span className="tabular-nums">({extra})</span>}
        </Button>
      </div>

      {open && (
        <div id="commission-filters" className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="grid gap-1 text-xs text-muted-foreground">
            {c.status}
            <AppSelect value={filter.status} onValueChange={(v) => set("status", v as CommissionFilter["status"])} options={[{ value: "", label: t.common.all }, ...STATUSES.map((v) => ({ value: v, label: t.status[v] }))]} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            {c.payment}
            <AppSelect value={filter.payment} onValueChange={(v) => set("payment", v as CommissionFilter["payment"])} options={[{ value: "", label: t.common.all }, ...PAYMENT_STATUSES.map((v) => ({ value: v, label: t.payment[v] }))]} />
          </label>
          <label className="col-span-2 grid gap-1 text-xs text-muted-foreground sm:col-span-1">
            {c.type}
            <AppSelect value={filter.type} onValueChange={(v) => set("type", v)} options={[{ value: "", label: t.common.all }, ...types.map((v) => ({ value: v, label: v }))]} />
          </label>
          <div className="col-span-full flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className="mr-1">{c.startDate}</span>
            {presets.map((p) => {
              const on = filter.from === p.from && filter.to === today;
              return (
                <Button
                  key={p.label}
                  type="button"
                  size="xs"
                  variant={on ? "secondary" : "ghost"}
                  aria-pressed={on}
                  onClick={() => onFilter({ ...filter, from: p.from, to: today })}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
          <label className="grid gap-1 text-xs text-muted-foreground">
            {c.from}
            <Input type="date" value={filter.from} max={filter.to || undefined} onChange={(e) => set("from", e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            {c.to}
            <Input type="date" value={filter.to} min={filter.from || undefined} onChange={(e) => set("to", e.target.value)} />
          </label>
          <div className="col-span-2 flex items-end sm:col-span-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={!activeFilterCount(filter)}
              onClick={() => onFilter(EMPTY_FILTER)}
            >
              <X /> {c.reset}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
