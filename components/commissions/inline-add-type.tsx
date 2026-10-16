"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { z } from "zod";
import { saveCatalogItem } from "@/app/[lang]/(admin)/settings/actions";
import { useDict } from "@/components/i18n-provider";
import { PriceInput } from "@/components/price-input";
import { parseRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { translateError } from "@/lib/i18n";
import { catalogItemSchema } from "@/lib/validators";

type Created = { id: string; name: string; base_price: number };

/**
 * Tambah tipe pesanan langsung dari form commission. Tipe tersimpan ke
 * Pengaturan dan langsung dipilih. Bukan <form> agar tidak bersarang di form commission.
 */
export function InlineAddType({ onCreated }: { onCreated: (t: Created) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<{ name?: string; price?: string; form?: string }>({});
  const [pending, startTransition] = useTransition();
  const { t } = useDict();

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setOpen(true)}>
        <Plus /> {t.form.newType}
      </Button>
    );
  }

  const add = () => {
    const parsed = catalogItemSchema.safeParse({
      name,
      price: parseRupiah(price) ?? Number.NaN,
      is_active: true,
    });
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors;
      setErrors({ name: f.name?.[0], price: f.price?.[0] });
      return;
    }
    startTransition(async () => {
      const result = await saveCatalogItem("type", null, parsed.data);
      if (result.id) {
        onCreated({ id: result.id, name: parsed.data.name, base_price: parsed.data.price });
        setName("");
        setPrice("");
        setErrors({});
        setOpen(false);
      } else {
        setErrors({ name: result.fieldErrors?.name?.[0], price: result.fieldErrors?.price?.[0], form: result.error });
      }
    });
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault(); // jangan submit form commission
      add();
    }
  };

  return (
    <div className="grid gap-2 rounded-lg bg-muted/50 p-3">
      <div className="grid grid-cols-[1fr_8rem] gap-2">
        <div className="grid gap-1">
          <Input
            autoFocus
            aria-label={t.form.newTypeName}
            placeholder={t.form.newTypeName}
            value={name}
            aria-invalid={Boolean(errors.name)}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onEnter}
          />
          {errors.name && <p className="text-sm text-destructive">{translateError(t, errors.name)}</p>}
        </div>
        <div className="grid gap-1">
          <PriceInput
            aria-label={t.form.newTypePrice}
            placeholder={t.common.price}
            value={price}
            aria-invalid={Boolean(errors.price)}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={onEnter}
          />
          {errors.price && <p className="text-sm text-destructive">{translateError(t, errors.price)}</p>}
        </div>
      </div>
      {errors.form && (
        <p className="text-sm text-destructive" role="alert">
          {errors.form}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button type="button" size="sm" onClick={add} disabled={pending}>
          {pending ? t.common.saving : t.form.addAndSelect}
        </Button>
      </div>
    </div>
  );
}
