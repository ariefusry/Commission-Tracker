import { Heart, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/auth/actions";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import type { Dict } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

function DonateLink({ t, compact = false }: { t: Dict; compact?: boolean }) {
  return (
    <Link
      href="/donasi"
      className="flex w-fit items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300"
    >
      <Heart className="size-3.5" />
      {compact ? <span className="sr-only">{t.nav.donate}</span> : t.nav.donate}
    </Link>
  );
}

// Membaca sesi: render di dalam <Suspense> (Cache Components).
async function Account({ variant }: { variant: "sidebar" | "header" }) {
  const supabase = await createClient();
  const [{ data }, { t }] = await Promise.all([supabase.auth.getClaims(), getDict()]);
  const email = data?.claims.email as string | undefined;

  if (variant === "header") {
    return (
      <div className="flex items-center gap-2">
        <DonateLink t={t} compact />
        <div className="flex items-center">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label={t.nav.logout}>
            <LogOut />
          </Button>
        </form>
      </div>
    );
  }

  // Sidebar: satu baris per fungsi (donasi, tampilan, akun) agar tidak berdesakan.
  return (
    <div className="grid gap-3">
      <DonateLink t={t} />
      <div className="grid gap-1 border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{t.nav.preferences}</span>
          <div className="flex items-center">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground" title={email}>
            {email}
          </span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label={t.nav.logout} title={t.nav.logout}>
              <LogOut />
            </Button>
          </form>
        </div>
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
