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
import { getDict } from "@/lib/i18n/server";


async function Content() {
  const [rows, stages, { slot_limit }, { t }] = await Promise.all([getCommissionRows(), getStages(), getPreferences(), getDict()]);
  const today = todayWib();
  const active = rows.filter((r) => r.status !== "done" && r.status !== "cancelled").length;
  const late = rows.filter((r) => deadlineInfo(r.deadline, r.status, today).tone === "late").length;

  if (!rows.length) {
    return (
      <StateMessage
        icon={ClipboardList}
        title={t.commissions.emptyTitle}
        description={t.commissions.emptyBody}
      >
        <Button nativeButton={false} render={<Link href="/commissions/new" />}>
          <Plus /> {t.commissions.addCommission}
        </Button>
      </StateMessage>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {t.commissions.activeOf(active, rows.length)}
        {late > 0 && <span className="text-destructive"> · {t.commissions.late(late)}</span>}
      </p>
      <CommissionViews data={rows} today={today} stages={stages} slotLimit={slot_limit} />
    </div>
  );
}

export default async function CommissionsPage() {
  const { t } = await getDict();
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t.commissions.title}</h1>
        <Button nativeButton={false} render={<Link href="/commissions/new" />}>
          <Plus /> {t.commissions.add}
        </Button>
      </div>
      <Suspense fallback={<SkeletonBlock className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
