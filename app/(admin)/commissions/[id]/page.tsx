import { notFound } from "next/navigation";
import { z } from "zod";
import { CommissionForm } from "@/components/commissions/commission-form";
import { getCommissionForEdit, getFormOptions } from "@/lib/data/commissions";

export default async function EditCommissionPage({ params }: PageProps<"/commissions/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const commission = await getCommissionForEdit(id);
  if (!commission) notFound();

  const { types, addons } = await getFormOptions({
    typeId: commission.snapshot.typeId,
    addonIds: commission.values.addon_ids,
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold">Edit commission</h1>
      <CommissionForm
        commissionId={id}
        defaultValues={commission.values}
        snapshot={commission.snapshot}
        types={types}
        addons={addons}
      />
    </div>
  );
}
