import { Plus } from "lucide-react";
import Link from "next/link";
import { CommissionTable } from "@/components/commissions/commission-table";
import { Button } from "@/components/ui/button";
import { getCommissionRows } from "@/lib/data/commissions";

export default async function CommissionsPage() {
  const rows = await getCommissionRows();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Commission</h1>
        <Button nativeButton={false} render={<Link href="/commissions/new" />}>
          <Plus /> Tambah
        </Button>
      </div>
      {rows.length ? (
        <CommissionTable data={rows} />
      ) : (
        <div className="grid justify-items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">Belum ada commission.</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/commissions/new" />}>
            Tambah commission pertama
          </Button>
        </div>
      )}
    </div>
  );
}
