import { LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/auth/actions";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { createClient, getActiveUntil } from "@/lib/supabase/server";
import { daysLeft } from "@/lib/subscription";

function SubscriptionPill({ left, className = "" }: { left: number; className?: string }) {
  const warn = left <= 3;
  return (
    <Link
      href="/billing"
      className={`w-fit rounded-full px-2.5 py-1 text-xs ${
        warn ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-muted text-muted-foreground"
      } ${className}`}
    >
      {left > 0 ? `Aktif ${left} hari lagi` : "Langganan habis"}
    </Link>
  );
}

// Membaca sesi: render di dalam <Suspense> (Cache Components).
async function Account({ variant }: { variant: "sidebar" | "header" }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const left = daysLeft(await getActiveUntil(supabase));
  const email = data?.claims.email as string | undefined;

  if (variant === "header") {
    return (
      <div className="flex items-center gap-2">
        {left <= 3 && <SubscriptionPill left={left} />}
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="Keluar">
            <LogOut />
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <SubscriptionPill left={left} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-muted-foreground" title={email}>
          {email}
        </span>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="Keluar">
            <LogOut />
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Kerangka halaman login: sidebar kiri di desktop, bar atas di HP. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-muted/30 p-4 lg:flex">
        <Logo />
        <NavLinks vertical />
        <div className="mt-auto">
          <Suspense fallback={<div className="h-16" />}>
            <Account variant="sidebar" />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Logo withText={false} />
            <NavLinks />
            <Suspense fallback={null}>
              <Account variant="header" />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
