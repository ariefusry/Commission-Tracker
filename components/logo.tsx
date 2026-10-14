import { Palette } from "lucide-react";
import Link from "next/link";

export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Commission Tracker">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Palette className="size-4.5" />
      </span>
      {withText && <span className="font-semibold tracking-tight">Commission Tracker</span>}
    </Link>
  );
}
