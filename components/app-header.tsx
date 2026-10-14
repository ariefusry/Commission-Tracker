import { LogOut } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { createClient, getActiveUntil } from "@/lib/supabase/server";
import { daysLeft } from "@/lib/subscription";

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/dashboard" className="hidden font-semibold tracking-tight sm:inline">
          Commission Tracker
        </Link>
        <NavLinks />
        {children}
      </div>
    </header>
  );
}

export function AppHeaderFallback() {
  return <Shell />;
}

// Membaca sesi: render di dalam <Suspense> (Cache Components).
export async function AppHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const left = daysLeft(await getActiveUntil(supabase));
  const warn = left <= 3;

  return (
    <Shell>
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/billing"
          className={`rounded-full px-2.5 py-1 text-xs ${
            warn
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              : "hidden bg-muted text-muted-foreground sm:inline"
          }`}
        >
          {left > 0 ? `Aktif ${left} hari lagi` : "Langganan habis"}
        </Link>
        <span className="hidden max-w-48 truncate text-muted-foreground lg:inline">
          {data?.claims.email as string | undefined}
        </span>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm" aria-label="Keluar">
            <LogOut />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </form>
      </div>
    </Shell>
  );
}
