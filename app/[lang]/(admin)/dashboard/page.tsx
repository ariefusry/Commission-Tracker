import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Onboarding } from "@/components/dashboard/onboarding";
import { SkeletonBlock } from "@/components/skeleton-block";
import { getCommissionRows } from "@/lib/data/commissions";
import { getPreferences, hasCustomPrices } from "@/lib/data/settings";
import { isIsoDate, parsePeriod } from "@/lib/stats";
import { todayWib } from "@/lib/date";
import { getDict } from "@/lib/i18n/server";


async function Content({ searchParams }: { searchParams: PageProps<"/[lang]/dashboard">["searchParams"] }) {
  const params = await searchParams;
  // menunggu request (connection) sebelum membaca jam
  const [rows, preferences, pricesSet] = await Promise.all([getCommissionRows(), getPreferences(), hasCustomPrices()]);
  const today = todayWib();
  return (
    <>
      <Onboarding pricesSet={pricesSet} hasCommission={rows.length > 0} />
      <DashboardView
        rows={rows}
        today={today}
        options={{ countCancelledPaid: preferences.count_cancelled_paid }}
        initial={{
          period: parsePeriod(params.period),
          from: isIsoDate(params.from) ? params.from : "",
          to: isIsoDate(params.to) ? params.to : "",
          type: typeof params.type === "string" ? params.type : "",
        }}
      />
    </>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/[lang]/dashboard">) {
  const { t } = await getDict();
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t.dashboard.title}</h1>
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
