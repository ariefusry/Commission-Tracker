"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { AppSelect, type SelectOption } from "@/components/app-select";
import { InlineAddType } from "@/components/commissions/inline-add-type";
import { useDict } from "@/components/i18n-provider";
import { saveCommission } from "@/app/[lang]/(admin)/commissions/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PriceInput } from "@/components/price-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CUSTOM_TYPE, PAYMENT_STATUSES, STATUSES, type StageOption } from "@/lib/commission";
import { localToday } from "@/lib/deadline";
import { formatRupiah, parseRupiah } from "@/lib/format";
import { translateError } from "@/lib/i18n";
import { amountDue, priceTotal } from "@/lib/pricing";
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
  stages: StageOption[];
  /** Bagian tambahan di kolom kiri, setelah "Lainnya" (mis. Gambar WIP). Tanpa <form> di dalamnya. */
  children?: React.ReactNode;
};

// Harga dari PriceInput berformat ribuan ("50.000"): ambil digitnya saja.
const toInt = (v: unknown) => parseRupiah(v) ?? 0;
const toIntOrNull = (v: unknown) => parseRupiah(v);

export function CommissionForm({ commissionId, defaultValues, types, addons, snapshot, stages, children }: Props) {
  const [pending, startTransition] = useTransition();
  const { t } = useDict();
  const f = t.form;
  // Tipe yang baru dibuat dari form ini (belum ada di props sampai server refresh).
  const [createdTypes, setCreatedTypes] = useState<TypeOption[]>([]);
  const allTypes = [...types, ...createdTypes.filter((c) => !types.some((t) => t.id === c.id))];
  const form = useForm<CommissionInput, unknown, CommissionValues>({
    resolver: zodResolver(commissionSchema),
    // Tanggal mulai default = hari ini di perangkat user.
    defaultValues: { ...defaultValues, start_date: defaultValues.start_date || localToday() },
  });
  const { register, handleSubmit, setValue, setError, formState } = form;
  const customAddons = useFieldArray({ control: form.control, name: "custom_addons" });

  const [typeId, addonIds, custom, override, payment, dpAmount] = useWatch({
    control: form.control,
    name: ["type_id", "addon_ids", "custom_addons", "price_override", "payment_status", "dp_amount"],
  });

  const typeName = typeId === CUSTOM_TYPE ? f.customTypeLabel : allTypes.find((t) => t.id === typeId)?.name;
  const basePrice =
    snapshot && snapshot.typeId === typeId
      ? snapshot.basePrice
      : (allTypes.find((t) => t.id === typeId)?.base_price ?? 0);
  const addonLines = [
    ...addonIds.map((id) => ({
      label: addons.find((a) => a.id === id)?.name ?? f.addons,
      price: snapshot?.addonPrices[id] ?? addons.find((a) => a.id === id)?.price ?? 0,
    })),
    ...custom.map((a) => ({
      label: a.name || f.customAddon,
      price: Number.isFinite(Number(a.price)) ? Number(a.price) : 0,
    })),
  ];
  const lines = [...(typeName ? [{ label: typeName, price: basePrice }] : []), ...addonLines];
  const total = priceTotal({ basePrice, addonPrices: addonLines.map((l) => l.price), override: override ?? null });
  const dp = payment === "dp" && Number.isFinite(Number(dpAmount)) ? Number(dpAmount) : 0;
  const due = amountDue(total, payment, dp);

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
    return translateError(t, (node as { message?: string } | undefined)?.message);
  };

  const field = (
    name: FieldPath<CommissionInput>,
    label: string,
    control: React.ReactNode,
    hint?: string,
    wide?: boolean,
    extra?: { required?: boolean; after?: React.ReactNode },
  ) => (
    <div className={`grid content-start gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={name}>
        {label}
        {extra?.required && (
          <>
            <span className="text-destructive" aria-hidden>
              *
            </span>
            <span className="sr-only">({t.form.required})</span>
          </>
        )}
      </Label>
      {control}
      {err(name) ? (
        <p className="text-sm text-destructive">{err(name)}</p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
      {extra?.after}
    </div>
  );

  const invalid = (name: FieldPath<CommissionInput>) => ({ id: name, "aria-invalid": Boolean(err(name)) });

  const select = (
    name: "type_id" | "stage_id" | "status" | "payment_status",
    options: SelectOption[],
    placeholder?: string,
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <AppSelect
          id={name}
          value={field.value}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          triggerRef={field.ref}
          options={options}
          placeholder={placeholder}
          invalid={Boolean(err(name))}
        />
      )}
    />
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:pb-0"
      noValidate
    >
      <div className="grid gap-6">
      <Section title={f.client}>
        {field("client_username", f.username, <Input {...invalid("client_username")} aria-required {...register("client_username")} />, undefined, false, { required: true })}
        {field("contact_platform", f.platform, <Input {...invalid("contact_platform")} placeholder={f.platformPlaceholder} {...register("contact_platform")} />)}
        {field("contact_handle", f.contact, <Input {...invalid("contact_handle")} placeholder={f.contactPlaceholder} {...register("contact_handle")} />)}
      </Section>

      <Section title={f.order}>
        {field(
          "type_id",
          f.type,
          select(
              "type_id",
              [
                ...allTypes.map((t) => ({ value: t.id, label: `${t.name} (${formatRupiah(t.base_price)})` })),
                // "Custom" hanya untuk commission lama yang sudah memakainya.
                ...(defaultValues.type_id === CUSTOM_TYPE
                  ? [{ value: CUSTOM_TYPE, label: `${f.customTypeLabel}: ${defaultValues.type_custom}` }]
                  : []),
              ],
              f.chooseType,
            ),
          undefined,
          false,
          {
            required: true,
            after: (
              <InlineAddType
                onCreated={(t) => {
                  setCreatedTypes((prev) => [...prev, t]);
                  setValue("type_id", t.id, { shouldDirty: true, shouldValidate: true });
                }}
              />
            ),
          },
        )}
        {typeId === CUSTOM_TYPE &&
          field("type_custom", f.customName, <Input {...invalid("type_custom")} {...register("type_custom")} />)}

        <fieldset className="grid gap-2 sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">{f.addons}</legend>
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
          {customAddons.fields.map((item, i) => (
            <div key={item.id} className="flex items-start gap-2">
              <div className="grid flex-1 gap-1">
                <Input placeholder={f.customAddonName} aria-label={f.customAddonName} aria-invalid={Boolean(err(`custom_addons.${i}.name`))} {...register(`custom_addons.${i}.name`)} />
                {err(`custom_addons.${i}.name`) && <p className="text-sm text-destructive">{err(`custom_addons.${i}.name`)}</p>}
              </div>
              <div className="grid w-32 gap-1">
                <PriceInput placeholder={t.common.price} aria-label={f.customAddonPrice} aria-invalid={Boolean(err(`custom_addons.${i}.price`))} {...register(`custom_addons.${i}.price`, { setValueAs: toInt })} />
                {err(`custom_addons.${i}.price`) && <p className="text-sm text-destructive">{err(`custom_addons.${i}.price`)}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={f.removeCustomAddon} onClick={() => customAddons.remove(i)}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => customAddons.append({ name: "", price: 0 })}>
            <Plus /> {f.customAddon}
          </Button>
        </fieldset>
      </Section>

      <Section title={f.schedule}>
        {field("start_date", f.startDate, <Input type="date" {...invalid("start_date")} {...register("start_date")} />)}
        {field("deadline", f.deadline, <Input type="date" {...invalid("deadline")} {...register("deadline")} />, f.deadlineHint)}
        {field(
          "stage_id",
          f.stage,
          select(
            "stage_id",
            // Tahap nonaktif tetap tampil untuk commission yang sedang memakainya.
            stages.filter((s) => s.is_active || s.id === defaultValues.stage_id).map((s) => ({ value: s.id, label: s.name })),
            f.chooseStage,
          ),
          stages.some((s) => s.is_active) ? undefined : f.noActiveStage,
        )}
        {field(
          "status",
          f.status,
          select("status", STATUSES.map((s) => ({ value: s, label: t.status[s] }))),
        )}
        {field("revision_count", f.revisions, <Input type="number" inputMode="numeric" min={0} {...invalid("revision_count")} {...register("revision_count", { setValueAs: toInt })} />)}
      </Section>

      <Section title={f.payment}>
        {field(
          "payment_status",
          f.paymentStatus,
          select("payment_status", PAYMENT_STATUSES.map((s) => ({ value: s, label: t.payment[s] }))),
        )}
        {payment === "dp" &&
          field("dp_amount", f.dpAmount, <PriceInput {...invalid("dp_amount")} {...register("dp_amount", { setValueAs: toInt })} />)}
        {field(
          "price_override",
          f.manualPrice,
          <PriceInput placeholder={f.auto} {...invalid("price_override")} {...register("price_override", { setValueAs: toIntOrNull })} />,
          f.manualPriceHint,
        )}
      </Section>

      <Section title={f.other}>
        {field(
          "reference_links",
          f.references,
          <Textarea rows={3} placeholder={f.referencesPlaceholder} {...invalid("reference_links")} {...register("reference_links")} />,
          undefined,
          true,
        )}
        {field("notes", f.notes, <Textarea rows={3} {...invalid("notes")} {...register("notes")} />, undefined, true)}
      </Section>
      {children}
      </div>

      {/* Ringkasan harga: panel kanan di desktop, di bawah form + bar bawah di HP. */}
      <aside className="grid gap-4 rounded-xl border bg-card p-4 lg:sticky lg:top-8">
        <h2 className="font-semibold">{f.summary}</h2>
        {lines.length > 0 ? (
          <ul className="grid gap-1.5 text-sm">
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate text-muted-foreground">{l.label}</span>
                <span className={`tabular-nums ${override !== null ? "text-muted-foreground line-through" : ""}`}>
                  {formatRupiah(l.price)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{f.chooseTypeForPrice}</p>
        )}
        <div className="grid gap-1.5 border-t pt-3 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="font-medium">{override !== null ? f.totalManual : t.common.total}</span>
            <span className="text-xl font-semibold tabular-nums">{formatRupiah(total)}</span>
          </div>
          {payment === "dp" && (
            <div className="flex justify-between text-muted-foreground">
              <span>{t.payment.dp}</span>
              <span className="tabular-nums">{formatRupiah(dp)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>{f.remaining}</span>
            <span className="tabular-nums">{formatRupiah(due)}</span>
          </div>
        </div>
        {formState.errors.root && (
          <p className="text-sm text-destructive" role="alert">
            {formState.errors.root.message}
          </p>
        )}
        <div className="hidden gap-2 lg:grid">
          <Button type="submit" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/commissions" />}>
            {t.common.cancel}
          </Button>
        </div>
      </aside>

      <div className="material scroll-edge-bottom fixed inset-x-0 bottom-0 z-20 border-t bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="grid">
            <span className="text-xs text-muted-foreground">{t.common.total}</span>
            <span className="font-semibold tabular-nums">{formatRupiah(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/commissions" />}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
