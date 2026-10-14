import { CommissionForm } from "@/components/commissions/commission-form";
import { FormPage } from "@/components/commissions/form-page";
import { getFormOptions, newCommissionDefaults } from "@/lib/data/commissions";

async function NewForm() {
  const { types, addons } = await getFormOptions();
  return <CommissionForm commissionId={null} defaultValues={newCommissionDefaults()} types={types} addons={addons} />;
}

export default function NewCommissionPage() {
  return (
    <FormPage title="Tambah commission">
      <NewForm />
    </FormPage>
  );
}
