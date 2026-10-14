import { CommissionForm } from "@/components/commissions/commission-form";
import { FormPage } from "@/components/commissions/form-page";
import { getFormOptions, newCommissionDefaults } from "@/lib/data/commissions";

async function NewForm() {
  const { types, addons, stages } = await getFormOptions();
  const defaults = { ...newCommissionDefaults(), stage_id: stages.find((s) => s.is_active)?.id ?? "" };
  return <CommissionForm commissionId={null} defaultValues={defaults} types={types} addons={addons} stages={stages} />;
}

export default function NewCommissionPage() {
  return (
    <FormPage title="Tambah commission">
      <NewForm />
    </FormPage>
  );
}
