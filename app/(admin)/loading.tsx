import { SkeletonBlock } from "@/components/skeleton-block";

export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Memuat">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-72" />
    </div>
  );
}
