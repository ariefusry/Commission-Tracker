import Link from "next/link";

/** `href={null}` untuk halaman publik (tanpa tautan ke dashboard). */
export function Logo({ withText = true, href = "/dashboard" }: { withText?: boolean; href?: string | null }) {
  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="40 22 176 212" fill="currentColor" className="size-4.5" aria-hidden>
          <path d="M116 34V112A20 20 0 0 0 116 144V232H76L48 142.4C42 112 94 84 116 34Z" />
          <path d="M140 34V112A20 20 0 0 1 140 144V232H180L208 142.4C214 112 162 84 140 34Z" />
        </svg>
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
