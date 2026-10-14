import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient, getActiveUntil } from "@/lib/supabase/server";
import { daysLeft } from "@/lib/subscription";

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/dashboard" className="font-semibold">
          Commission Tracker
        </Link>
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

  return (
    <Shell>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/billing" className="hidden text-muted-foreground sm:inline">
            {left > 0 ? `Aktif ${left} hari lagi` : "Langganan habis"}
          </Link>
          <span className="hidden max-w-48 truncate text-muted-foreground md:inline">
            {data?.claims.email as string | undefined}
          </span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Keluar
            </Button>
          </form>
        </div>
    </Shell>
  );
}
