import { existsSync } from "node:fs";
import path from "node:path";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Dukung Commission Tracker",
  description: "Commission Tracker gratis untuk semua artist. Dukung lewat donasi QRIS.",
};

// Gambar QRIS diletakkan pemilik aplikasi di public/qris.png.
const QRIS_FILE = "qris.png";
const hasQris = existsSync(path.join(process.cwd(), "public", QRIS_FILE));

export default function DonasiPage() {
  return (
    <main className="relative flex flex-1 justify-center bg-muted/40 px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="grid w-full max-w-sm content-start gap-6">
        <div className="justify-self-center">
          <Logo href={null} />
        </div>
        <article className="grid justify-items-center gap-4 rounded-xl border bg-card p-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
            <Heart className="size-5" />
          </span>
          <div className="grid gap-1">
            <h1 className="text-lg font-semibold">Dukung aplikasi ini</h1>
            <p className="text-sm text-muted-foreground">
              Commission Tracker gratis untuk semua artist. Donasi membantu biaya server dan pengembangan fitur baru.
            </p>
          </div>
          {hasQris ? (
            <Image
              src={`/${QRIS_FILE}`}
              alt="QRIS untuk donasi"
              width={280}
              height={280}
              className="h-auto w-full max-w-64 rounded-lg border bg-white p-2"
              priority
            />
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">QRIS belum dipasang.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Scan dengan aplikasi bank atau e-wallet apa pun yang mendukung QRIS. Nominal bebas.
          </p>
        </article>
        <Link href="/dashboard" className="justify-self-center text-sm text-muted-foreground underline underline-offset-4">
          Kembali
        </Link>
      </div>
    </main>
  );
}
