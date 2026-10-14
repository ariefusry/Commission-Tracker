export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} aria-hidden="true" />;
}
