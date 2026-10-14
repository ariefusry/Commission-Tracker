"use client";

import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { z } from "zod";
import { deleteCatalogItem, moveType, saveCatalogItem, type CatalogKind } from "@/app/(admin)/settings/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PriceInput } from "@/components/price-input";
import { Input } from "@/components/ui/input";
import { catalogItemSchema } from "@/lib/validators";

export type CatalogItem = { id: string; name: string; price: number; is_active: boolean; used: number };

type Errors = { name?: string; price?: string; form?: string };

function useItemForm(initial: { name: string; price: string; is_active: boolean }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  const submit = (save: (v: { name: string; price: number; is_active: boolean }) => Promise<{ error?: string; fieldErrors?: Record<string, string[] | undefined> }>, onDone?: () => void) => {
    const input = { name: values.name, price: values.price === "" ? Number.NaN : Number(values.price), is_active: values.is_active };
    const parsed = catalogItemSchema.safeParse(input);
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors;
      setErrors({ name: f.name?.[0], price: f.price?.[0] });
      return;
    }
    startTransition(async () => {
      const result = await save(parsed.data);
      setErrors({ name: result.fieldErrors?.name?.[0], price: result.fieldErrors?.price?.[0], form: result.error });
      if (!result.error && !result.fieldErrors) onDone?.();
    });
  };

  return { values, setValues, errors, setErrors, pending, startTransition, submit };
}

function Row({ kind, item, first, last }: { kind: CatalogKind; item: CatalogItem; first: boolean; last: boolean }) {
  const initial = { name: item.name, price: String(item.price), is_active: item.is_active };
  const f = useItemForm(initial);
  const dirty =
    f.values.name !== item.name || f.values.price !== String(item.price) || f.values.is_active !== item.is_active;

  const run = (action: () => Promise<{ error?: string }>) =>
    f.startTransition(async () => {
      const result = await action();
      f.setErrors(result.error ? { form: result.error } : {});
    });

  return (
    <li className="grid gap-2 border-b py-3 last:border-b-0">
      <form
        className="grid grid-cols-[1fr_7.5rem] items-start gap-2 sm:grid-cols-[1fr_9rem_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          f.submit((v) => saveCatalogItem(kind, item.id, v));
        }}
      >
        <div className="col-span-2 grid gap-1 sm:col-span-1">
          <Input
            aria-label="Nama"
            value={f.values.name}
            aria-invalid={Boolean(f.errors.name)}
            onChange={(e) => f.setValues({ ...f.values, name: e.target.value })}
          />
          {f.errors.name && <p className="text-sm text-destructive">{f.errors.name}</p>}
          {item.used > 0 && <p className="text-xs text-muted-foreground">Dipakai {item.used} commission</p>}
        </div>
        <div className="grid gap-1">
          <PriceInput
            aria-label="Harga"
            value={f.values.price}
            aria-invalid={Boolean(f.errors.price)}
            onChange={(e) => f.setValues({ ...f.values, price: e.target.value })}
          />
          {f.errors.price && <p className="text-sm text-destructive">{f.errors.price}</p>}
        </div>
        <label className="flex h-8 items-center gap-2 text-sm">
          <Checkbox
            checked={f.values.is_active}
            onCheckedChange={(checked) => f.setValues({ ...f.values, is_active: checked })}
          />
          Aktif
        </label>
        <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
          {kind === "type" && (
            <>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Naikkan ${item.name}`} disabled={first || f.pending} onClick={() => run(() => moveType(item.id, "up"))}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Turunkan ${item.name}`} disabled={last || f.pending} onClick={() => run(() => moveType(item.id, "down"))}>
                <ArrowDown />
              </Button>
            </>
          )}
          <ConfirmDeleteButton
            label={`Hapus ${item.name}`}
            title={`Hapus "${item.name}"?`}
            description={
              item.used > 0
                ? `Dipakai ${item.used} commission, jadi tidak bisa dihapus. Hilangkan centang Aktif agar tidak muncul di form baru.`
                : "Item ini akan dihapus permanen."
            }
            disabled={f.pending}
            onConfirm={() => deleteCatalogItem(kind, item.id)}
          />
          <Button type="submit" size="sm" disabled={!dirty || f.pending}>
            {f.pending ? "..." : "Simpan"}
          </Button>
        </div>
      </form>
      {f.errors.form && (
        <p className="text-sm text-destructive" role="alert">
          {f.errors.form}
        </p>
      )}
    </li>
  );
}

function AddRow({ kind, label }: { kind: CatalogKind; label: string }) {
  const empty = { name: "", price: "", is_active: true };
  const f = useItemForm(empty);

  return (
    <form
      className="grid grid-cols-[1fr_7.5rem] items-start gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_9rem_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        f.submit((v) => saveCatalogItem(kind, null, v), () => f.setValues(empty));
      }}
    >
      <div className="col-span-2 grid gap-1 sm:col-span-1">
        <Input
          aria-label={`Nama ${label} baru`}
          placeholder={`Nama ${label} baru`}
          value={f.values.name}
          aria-invalid={Boolean(f.errors.name)}
          onChange={(e) => f.setValues({ ...f.values, name: e.target.value })}
        />
        {f.errors.name && <p className="text-sm text-destructive">{f.errors.name}</p>}
      </div>
      <div className="grid gap-1">
        <PriceInput
          aria-label="Harga"
          placeholder="Harga"
          value={f.values.price}
          aria-invalid={Boolean(f.errors.price)}
          onChange={(e) => f.setValues({ ...f.values, price: e.target.value })}
        />
        {f.errors.price && <p className="text-sm text-destructive">{f.errors.price}</p>}
      </div>
      <Button type="submit" disabled={f.pending}>
        <Plus /> Tambah
      </Button>
      {f.errors.form && (
        <p className="col-span-full text-sm text-destructive" role="alert">
          {f.errors.form}
        </p>
      )}
    </form>
  );
}

export function CatalogEditor({ kind, label, items }: { kind: CatalogKind; label: string; items: CatalogItem[] }) {
  return (
    <div className="grid gap-3">
      {items.length > 0 ? (
        <ul>
          {items.map((item, i) => (
            // key ikut harga/nama agar state baris reset setelah data server berubah
            <Row key={`${item.id}:${item.name}:${item.price}:${item.is_active}`} kind={kind} item={item} first={i === 0} last={i === items.length - 1} />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">Belum ada {label}.</p>
      )}
      <AddRow kind={kind} label={label} />
    </div>
  );
}
