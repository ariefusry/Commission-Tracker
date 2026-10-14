import { CommissionForm } from "@/components/commissions/commission-form";
import { getFormOptions, newCommissionDefaults } from "@/lib/data/commissions";

export default async function NewCommissionPage() {
  const { types, addons } = await getFormOptions();

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold">Tambah commission</h1>
      <CommissionForm commissionId={null} defaultValues={newCommissionDefaults()} types={types} addons={addons} />
    </div>
  );
}
