import { notFound } from "next/navigation";
import { z } from "zod";
import { CommissionForm } from "@/components/commissions/commission-form";
import { FormPage } from "@/components/commissions/form-page";
import { getCommissionForEdit, getFormOptions } from "@/lib/data/commissions";

async function EditForm({ params }: { params: PageProps<"/commissions/[id]">["params"] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const commission = await getCommissionForEdit(id);
  if (!commission) notFound();

  const { types, addons } = await getFormOptions({
    typeId: commission.snapshot.typeId,
    addonIds: commission.values.addon_ids,
  });

  return (
    <CommissionForm
      commissionId={id}
      defaultValues={commission.values}
      snapshot={commission.snapshot}
      types={types}
      addons={addons}
    />
  );
}

export default function EditCommissionPage({ params }: PageProps<"/commissions/[id]">) {
  return (
    <FormPage title="Edit commission">
      <EditForm params={params} />
    </FormPage>
  );
}
