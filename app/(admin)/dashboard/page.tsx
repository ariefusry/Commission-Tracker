import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { SkeletonBlock } from "@/components/skeleton-block";
import { getCommissionRows } from "@/lib/data/commissions";
import { getPreferences } from "@/lib/data/settings";
import { isIsoDate, parsePeriod } from "@/lib/stats";
import { todayWib } from "@/lib/date";

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const params = await searchParams;
  // menunggu request (connection) sebelum membaca jam
  const [rows, preferences] = await Promise.all([getCommissionRows(), getPreferences()]);
  const today = todayWib();
  return (
    <DashboardView
      rows={rows}
      today={today}
      options={{ countCancelledPaid: preferences.count_cancelled_paid }}
      initial={{
        period: parsePeriod(params.period),
        from: isIsoDate(params.from) ? params.from : "",
        to: isIsoDate(params.to) ? params.to : "",
      }}
    />
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense
        fallback={
          <>
            <SkeletonBlock className="h-9 w-80" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonBlock key={i} className="h-28" />
              ))}
            </div>
            <SkeletonBlock className="h-80" />
          </>
        }
      >
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
