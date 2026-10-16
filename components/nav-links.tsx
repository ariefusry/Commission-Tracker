"use client";

import { ClipboardList, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useDict } from "@/components/i18n-provider";
import { LOCALES } from "@/lib/i18n";

const LOCALE_PREFIX = new RegExp(`^/(?:${LOCALES.join("|")})(?=/|$)`);

const LINKS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/commissions", key: "commissions", icon: ClipboardList },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

const isActive = (pathname: string | null, href: string) =>
  pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

// URL hasil rewrite proxy berisi segmen bahasa (/en/dashboard): buang dulu.
const usePath = () => usePathname().replace(LOCALE_PREFIX, "") || "/";

function Links({ pathname }: { pathname: string | null }) {
  const { t } = useDict();
  return LINKS.map(({ href, key, icon: Icon }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors ${
          active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        <Icon className="size-4" aria-hidden />
        {t.nav[key]}
      </Link>
    );
  });
}

function ActiveLinks() {
  return <Links pathname={usePath()} />;
}

/** Navigasi sidebar desktop. HP memakai TabBar. */
export function NavLinks() {
  return (
    <nav className="grid gap-1 text-sm">
      {/* usePathname = data URL: di dalam Suspense agar shell tetap prerender. */}
      <Suspense fallback={<Links pathname={null} />}>
        <ActiveLinks />
      </Suspense>
    </nav>
  );
}

function Bar({ pathname }: { pathname: string | null }) {
  const { t } = useDict();
  // Layar turunan (form tambah/edit) punya bar aksi sendiri di bawah: tab bar disembunyikan, seperti iOS.
  if (pathname?.startsWith("/commissions/")) return null;
  return (
    <>
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label={t.nav.main}
        className="material scroll-edge-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {LINKS.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-[0.7rem] font-medium tracking-wide transition-[color,transform] duration-100 active:scale-95 ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {t.nav[key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function ActiveBar() {
  return <Bar pathname={usePath()} />;
}

/** Tab bar bawah untuk HP: tujuan utama selalu terlihat dan berlabel. */
export function TabBar() {
  return (
    <Suspense fallback={<Bar pathname={null} />}>
      <ActiveBar />
    </Suspense>
  );
}
