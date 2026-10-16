import { ChartColumn, KanbanSquare, Link2, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `Commission Tracker · ${t.landing.title}`, description: t.landing.subtitle };
}

const FEATURE_ICONS = [KanbanSquare, Wallet, Link2, ChartColumn];

/** Halaman depan publik. User yang sudah login diarahkan proxy ke /dashboard. */
export default async function LandingPage() {
  const { locale, t } = await getDict();
  const l = t.landing;
  // Screenshot mengikuti bahasa halaman.
  const shot = (name: string) => `/landing/${locale}/${name}.png`;
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo href={null} />
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
            {l.login}
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-16 sm:px-6 lg:pt-16">
        <div className="mx-auto grid max-w-2xl justify-items-center gap-5 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{l.title}</h1>
          <p className="text-base text-pretty text-muted-foreground sm:text-lg">{l.subtitle}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" className="h-11 px-5" nativeButton={false} render={<Link href="/signup" />}>
              {l.signup}
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-5" nativeButton={false} render={<Link href="/login" />}>
              {l.login}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{l.free}</p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-muted/40 shadow-sm">
          <Image src={shot("dashboard-light")} alt={l.shotDashboard} width={1280} height={1146} priority className="h-auto w-full dark:hidden" />
          <Image src={shot("dashboard-dark")} alt={l.shotDashboard} width={1280} height={1146} className="hidden h-auto w-full dark:block" />
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">{l.featuresTitle}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {l.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <li key={f.title} className="grid content-start gap-2 rounded-xl border bg-card p-5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground" aria-hidden>
                    <Icon className="size-4.5" />
                  </span>
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="grid max-w-xl gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{l.clientTitle}</h2>
          <p className="text-muted-foreground">{l.clientBody}</p>
          <p className="text-sm text-muted-foreground">{l.extras}</p>
          <div>
            <Button size="lg" className="h-11 px-5" nativeButton={false} render={<Link href="/signup" />}>
              {l.signup}
            </Button>
          </div>
        </div>
        <div className="mx-auto w-64 overflow-hidden rounded-[1.75rem] border-4 border-foreground/10 shadow-sm">
          <Image src={shot("tracking-mobile")} alt={l.shotTracking} width={390} height={904} className="h-auto w-full" />
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>Commission Tracker</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              {t.nav.privacy}
            </Link>
            <Link href="/donasi" className="hover:text-foreground">
              {t.nav.donate}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
