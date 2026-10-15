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

type Props = { vertical?: boolean };

function Links({ pathname, vertical }: Props & { pathname: string | null }) {
  const { t } = useDict();
  return LINKS.map(({ href, key, icon: Icon }) => {
    const label = t.nav[key];
    const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        title={label}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-md transition-colors ${vertical ? "px-3 py-2" : "px-2.5 py-1.5"} ${
          active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        <Icon className="size-4" aria-hidden />
        {/* Bar atas HP sempit: cukup ikon (halaman aktif ditandai latar). */}
        <span className={vertical ? undefined : "sr-only sm:not-sr-only"}>{label}</span>
      </Link>
    );
  });
}

function ActiveLinks({ vertical }: Props) {
  // URL hasil rewrite proxy berisi segmen bahasa (/en/dashboard): buang dulu.
  const pathname = usePathname().replace(LOCALE_PREFIX, "") || "/";
  return <Links pathname={pathname} vertical={vertical} />;
}

export function NavLinks({ vertical }: Props) {
  return (
    <nav className={vertical ? "grid gap-1 text-sm" : "mr-auto flex gap-1 text-sm"}>
      {/* usePathname = data URL: di dalam Suspense agar shell tetap prerender. */}
      <Suspense fallback={<Links pathname={null} vertical={vertical} />}>
        <ActiveLinks vertical={vertical} />
      </Suspense>
    </nav>
  );
}
