import { Suspense } from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { SkeletonBlock } from "@/components/skeleton-block";
import { getCatalog, getPreferences } from "@/lib/data/settings";
import { parseSettingsTab } from "@/lib/settings-tabs";

async function Content({ searchParams }: { searchParams: PageProps<"/settings">["searchParams"] }) {
  const initial = parseSettingsTab((await searchParams).tab);
  const [{ types, addons, stages }, preferences] = await Promise.all([getCatalog(), getPreferences()]);
  return <SettingsTabs initial={initial} items={{ type: types, addon: addons, stage: stages }} preferences={preferences} />;
}

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Commission lama tetap memakai harga saat dipesan. Item yang tidak aktif disembunyikan dari form baru.
        </p>
      </div>
      <Suspense fallback={<SkeletonBlock className="h-96" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
