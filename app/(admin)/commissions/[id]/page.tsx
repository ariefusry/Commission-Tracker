import { notFound } from "next/navigation";
import { z } from "zod";
import { CommissionForm } from "@/components/commissions/commission-form";
import { FormPage } from "@/components/commissions/form-page";
import { WipManager } from "@/components/commissions/wip-manager";
import { getCommissionForEdit, getFormOptions, getWipImages } from "@/lib/data/commissions";

async function EditForm({ params }: { params: PageProps<"/commissions/[id]">["params"] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const commission = await getCommissionForEdit(id);
  if (!commission) notFound();

  const [{ types, addons, stages }, wip] = await Promise.all([
    getFormOptions({ typeId: commission.snapshot.typeId, addonIds: commission.values.addon_ids }),
    getWipImages(id),
  ]);

  return (
    <div className="grid gap-6">
      <CommissionForm
      commissionId={id}
      defaultValues={commission.values}
      snapshot={commission.snapshot}
      types={types}
      addons={addons}
      stages={stages}
      />
      <WipManager commissionId={id} images={wip} />
    </div>
  );
}

export default function EditCommissionPage({ params }: PageProps<"/commissions/[id]">) {
  return (
    <FormPage title="Edit commission">
      <EditForm params={params} />
    </FormPage>
  );
}
