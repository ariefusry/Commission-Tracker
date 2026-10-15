import { SkeletonBlock } from "@/components/skeleton-block";
import { getDict } from "@/lib/i18n/server";


export default async function Loading() {
  const { t } = await getDict();
  return (
    <div className="grid gap-4" aria-busy="true" aria-label={t.common.loading}>
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-72" />
    </div>
  );
}
