"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/commissions", label: "Commission" },
  { href: "/settings", label: "Pengaturan" },
];

function Links({ pathname }: { pathname: string | null }) {
  return LINKS.map((l) => {
    const active = pathname !== null && (pathname === l.href || pathname.startsWith(`${l.href}/`));
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`rounded-md px-2.5 py-1.5 transition-colors ${
          active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {l.label}
      </Link>
    );
  });
}

function ActiveLinks() {
  return <Links pathname={usePathname()} />;
}

export function NavLinks() {
  return (
    <nav className="mr-auto flex gap-1 text-sm">
      {/* usePathname = data URL: di dalam Suspense agar shell tetap prerender. */}
      <Suspense fallback={<Links pathname={null} />}>
        <ActiveLinks />
      </Suspense>
    </nav>
  );
}
