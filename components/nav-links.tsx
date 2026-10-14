"use client";

import { ClipboardList, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/commissions", label: "Commission", icon: ClipboardList },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

type Props = { vertical?: boolean };

function Links({ pathname, vertical }: Props & { pathname: string | null }) {
  return LINKS.map(({ href, label, icon: Icon }) => {
    const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-md transition-colors ${vertical ? "px-3 py-2" : "px-2.5 py-1.5"} ${
          active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        {vertical && <Icon className="size-4" />}
        {label}
      </Link>
    );
  });
}

function ActiveLinks({ vertical }: Props) {
  return <Links pathname={usePathname()} vertical={vertical} />;
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
