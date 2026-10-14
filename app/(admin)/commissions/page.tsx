import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CommissionViews } from "@/components/commissions/commission-views";
import { SkeletonBlock } from "@/components/skeleton-block";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { getCommissionRows, getStages } from "@/lib/data/commissions";
import { getPreferences } from "@/lib/data/settings";
import { deadlineInfo } from "@/lib/deadline";
import { todayWib } from "@/lib/date";

async function Content() {
  const [rows, stages, { slot_limit }] = await Promise.all([getCommissionRows(), getStages(), getPreferences()]);
  const today = todayWib();
  const active = rows.filter((r) => r.status !== "done" && r.status !== "cancelled").length;
  const late = rows.filter((r) => deadlineInfo(r.deadline, r.status, today).tone === "late").length;

  if (!rows.length) {
    return (
      <StateMessage
        icon={ClipboardList}
        title="Belum ada commission"
        description="Catat pesanan pertama untuk mulai melacak progress dan pembayaran."
      >
        <Button nativeButton={false} render={<Link href="/commissions/new" />}>
          <Plus /> Tambah commission
        </Button>
      </StateMessage>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {active} aktif dari {rows.length}
        {late > 0 && <span className="text-destructive"> · {late} terlambat</span>}
      </p>
      <CommissionViews data={rows} today={today} stages={stages} slotLimit={slot_limit} />
    </div>
  );
}

export default function CommissionsPage() {
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Commission</h1>
        <Button nativeButton={false} render={<Link href="/commissions/new" />}>
          <Plus /> Tambah
        </Button>
      </div>
      <Suspense fallback={<SkeletonBlock className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
