import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { SkeletonBlock } from "@/components/skeleton-block";

/** Kerangka halaman tambah/edit: judul statis, form di-stream. */
export function FormPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <Link href="/commissions" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Commission
      </Link>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <SkeletonBlock className="h-[36rem]" />
            <SkeletonBlock className="hidden h-64 lg:block" />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
