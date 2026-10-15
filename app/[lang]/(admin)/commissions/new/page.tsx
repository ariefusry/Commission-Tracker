import { CommissionForm } from "@/components/commissions/commission-form";
import { FormPage } from "@/components/commissions/form-page";
import { getFormOptions, getWorkingCount, newCommissionDefaults } from "@/lib/data/commissions";
import { getPreferences } from "@/lib/data/settings";

async function NewForm() {
  const [{ types, addons, stages }, working, { slot_limit }] = await Promise.all([
    getFormOptions(),
    getWorkingCount(),
    getPreferences(),
  ]);
  const defaults = {
    ...newCommissionDefaults(),
    stage_id: stages.find((s) => s.is_active)?.id ?? "",
    // Slot masih ada → langsung dikerjakan; penuh → masuk waiting list.
    status: working < slot_limit ? ("in_progress" as const) : ("queue" as const),
  };
  return <CommissionForm commissionId={null} defaultValues={defaults} types={types} addons={addons} stages={stages} />;
}

export default function NewCommissionPage() {
  return (
    <FormPage title="newTitle">
      <NewForm />
    </FormPage>
  );
}
