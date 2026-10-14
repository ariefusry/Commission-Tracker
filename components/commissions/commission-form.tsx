"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { saveCommission } from "@/app/(admin)/commissions/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOM_TYPE,
  PAYMENT_LABEL,
  PAYMENT_STATUSES,
  STAGE_LABEL,
  STAGES,
  STATUS_LABEL,
  STATUSES,
} from "@/lib/commission";
import { formatRupiah } from "@/lib/format";
import { priceTotal } from "@/lib/pricing";
import { commissionSchema, type CommissionInput, type CommissionValues } from "@/lib/validators";

export type TypeOption = { id: string; name: string; base_price: number };
export type AddonOption = { id: string; name: string; price: number };
/** Harga yang sudah di-snapshot saat commission ini disimpan (mode edit). */
export type PriceSnapshot = { typeId: string | null; basePrice: number; addonPrices: Record<string, number> };

type Props = {
  commissionId: string | null;
  defaultValues: CommissionInput;
  types: TypeOption[];
  addons: AddonOption[];
  snapshot?: PriceSnapshot;
};

const toInt = (v: unknown) => (v === "" || v === null ? 0 : Number(v));
const toIntOrNull = (v: unknown) => (v === "" || v === null ? null : Number(v));

export function CommissionForm({ commissionId, defaultValues, types, addons, snapshot }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CommissionInput, unknown, CommissionValues>({
    resolver: zodResolver(commissionSchema),
    defaultValues,
  });
  const { register, handleSubmit, setValue, setError, formState } = form;
  const customAddons = useFieldArray({ control: form.control, name: "custom_addons" });

  const [typeId, addonIds, custom, override, stage, payment] = useWatch({
    control: form.control,
    name: ["type_id", "addon_ids", "custom_addons", "price_override", "stage", "payment_status"],
  });

  const basePrice =
    snapshot && snapshot.typeId === typeId
      ? snapshot.basePrice
      : (types.find((t) => t.id === typeId)?.base_price ?? 0);
  const preview = priceTotal({
    basePrice,
    addonPrices: [
      ...addonIds.map((id) => snapshot?.addonPrices[id] ?? addons.find((a) => a.id === id)?.price ?? 0),
      ...custom.map((a) => (Number.isFinite(Number(a.price)) ? Number(a.price) : 0)),
    ],
    override: override ?? null,
  });

  const onSubmit = (values: CommissionValues) =>
    startTransition(async () => {
      const result = await saveCommission(commissionId, values);
      if (result?.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) setError(name as FieldPath<CommissionInput>, { message: messages[0] });
        }
      }
      if (result?.error) setError("root", { message: result.error });
    });

  const err = (name: FieldPath<CommissionInput>) => {
    const parts = name.split(".");
    let node: unknown = formState.errors;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    return (node as { message?: string } | undefined)?.message;
  };

  const field = (name: FieldPath<CommissionInput>, label: string, control: React.ReactNode, hint?: string) => (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {control}
      {err(name) ? (
        <p className="text-sm text-destructive">{err(name)}</p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );

  const invalid = (name: FieldPath<CommissionInput>) => ({ id: name, "aria-invalid": Boolean(err(name)) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8" noValidate>
      <Section title="Client">
        {field("client_username", "Username client", <Input {...invalid("client_username")} {...register("client_username")} />)}
        {field("contact_platform", "Platform", <Input {...invalid("contact_platform")} placeholder="Twitter, Discord, ..." {...register("contact_platform")} />)}
        {field("contact_handle", "Kontak", <Input {...invalid("contact_handle")} placeholder="@handle" {...register("contact_handle")} />)}
      </Section>

      <Section title="Pesanan">
        {field(
          "type_id",
          "Tipe",
          <NativeSelect className="w-full" {...invalid("type_id")} {...register("type_id")}>
            <NativeSelectOption value="">Pilih tipe</NativeSelectOption>
            {types.map((t) => (
              <NativeSelectOption key={t.id} value={t.id}>
                {t.name} ({formatRupiah(t.base_price)})
              </NativeSelectOption>
            ))}
            <NativeSelectOption value={CUSTOM_TYPE}>Custom</NativeSelectOption>
          </NativeSelect>,
        )}
        {typeId === CUSTOM_TYPE &&
          field("type_custom", "Nama tipe custom", <Input {...invalid("type_custom")} {...register("type_custom")} />)}

        <fieldset className="grid gap-2 sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">Add-on</legend>
          {addons.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={addonIds.includes(a.id)}
                onCheckedChange={(checked) =>
                  setValue(
                    "addon_ids",
                    checked ? [...addonIds, a.id] : addonIds.filter((id) => id !== a.id),
                    { shouldDirty: true },
                  )
                }
              />
              {a.name} (+{formatRupiah(snapshot?.addonPrices[a.id] ?? a.price)})
            </label>
          ))}
          {customAddons.fields.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <div className="grid flex-1 gap-1">
                <Input placeholder="Nama add-on custom" aria-label="Nama add-on custom" aria-invalid={Boolean(err(`custom_addons.${i}.name`))} {...register(`custom_addons.${i}.name`)} />
                {err(`custom_addons.${i}.name`) && <p className="text-sm text-destructive">{err(`custom_addons.${i}.name`)}</p>}
              </div>
              <div className="grid w-32 gap-1">
                <Input type="number" inputMode="numeric" min={0} placeholder="Harga" aria-label="Harga add-on custom" aria-invalid={Boolean(err(`custom_addons.${i}.price`))} {...register(`custom_addons.${i}.price`, { setValueAs: toInt })} />
                {err(`custom_addons.${i}.price`) && <p className="text-sm text-destructive">{err(`custom_addons.${i}.price`)}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Hapus add-on custom" onClick={() => customAddons.remove(i)}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => customAddons.append({ name: "", price: 0 })}>
            <Plus /> Add-on custom
          </Button>
        </fieldset>
      </Section>

      <Section title="Jadwal & progress">
        {field("start_date", "Tanggal mulai", <Input type="date" {...invalid("start_date")} {...register("start_date")} />)}
        {field("deadline", "Deadline", <Input type="date" {...invalid("deadline")} {...register("deadline")} />, "Kosongkan jika belum ada")}
        {field(
          "stage",
          "Tahap",
          <NativeSelect className="w-full" {...invalid("stage")} {...register("stage")}>
            {STAGES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {STAGE_LABEL[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>,
        )}
        {stage === "custom" &&
          field("stage_custom", "Nama tahap custom", <Input {...invalid("stage_custom")} {...register("stage_custom")} />)}
        {field(
          "status",
          "Status",
          <NativeSelect className="w-full" {...invalid("status")} {...register("status")}>
            {STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {STATUS_LABEL[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>,
        )}
        {field("revision_count", "Jumlah revisi", <Input type="number" inputMode="numeric" min={0} {...invalid("revision_count")} {...register("revision_count", { setValueAs: toInt })} />)}
      </Section>

      <Section title="Pembayaran">
        {field(
          "payment_status",
          "Status bayar",
          <NativeSelect className="w-full" {...invalid("payment_status")} {...register("payment_status")}>
            {PAYMENT_STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {PAYMENT_LABEL[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>,
        )}
        {payment === "dp" &&
          field("dp_amount", "Nominal DP", <Input type="number" inputMode="numeric" min={0} {...invalid("dp_amount")} {...register("dp_amount", { setValueAs: toInt })} />)}
        {field(
          "price_override",
          "Harga manual",
          <Input type="number" inputMode="numeric" min={0} placeholder="Otomatis" {...invalid("price_override")} {...register("price_override", { setValueAs: toIntOrNull })} />,
          "Kosongkan untuk harga otomatis dari tipe + add-on",
        )}
        <div className="grid content-start gap-1 rounded-lg bg-muted p-3 sm:col-span-2">
          <span className="text-sm text-muted-foreground">Harga total</span>
          <span className="text-xl font-semibold">{formatRupiah(preview)}</span>
        </div>
      </Section>

      <Section title="Lainnya">
        {field(
          "reference_links",
          "Link referensi",
          <Textarea rows={3} placeholder="Satu link per baris" {...invalid("reference_links")} {...register("reference_links")} />,
        )}
        {field("notes", "Catatan", <Textarea rows={3} {...invalid("notes")} {...register("notes")} />)}
      </Section>

      {formState.errors.root && (
        <p className="text-sm text-destructive" role="alert">
          {formState.errors.root.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/commissions" />}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
