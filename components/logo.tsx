import { Palette } from "lucide-react";
import Link from "next/link";

/** `href={null}` untuk halaman publik (tanpa tautan ke dashboard). */
export function Logo({ withText = true, href = "/dashboard" }: { withText?: boolean; href?: string | null }) {
  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Palette className="size-4.5" />
      </span>
      {withText && <span className="font-semibold tracking-tight">Commission Tracker</span>}
    </>
  );
  return href ? (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Commission Tracker">
      {content}
    </Link>
  ) : (
    <span className="flex items-center gap-2.5">{content}</span>
  );
}
