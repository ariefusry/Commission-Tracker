import { existsSync } from "node:fs";
import path from "node:path";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageControls } from "@/components/page-controls";
import { getDict } from "@/lib/i18n/server";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.meta.donate, description: t.meta.donateDescription };
}

// Gambar QRIS diletakkan pemilik aplikasi di public/qris.png.
const QRIS_FILE = "qris.png";
const hasQris = existsSync(path.join(process.cwd(), "public", QRIS_FILE));

export default async function DonasiPage() {
  const { t } = await getDict();
  return (
    <main className="relative flex flex-1 justify-center bg-muted/40 px-4 py-10">
      <PageControls />
      <div className="grid w-full max-w-sm content-start gap-6">
        <div className="justify-self-center">
          <Logo href={null} />
        </div>
        <article className="grid justify-items-center gap-4 rounded-xl border bg-card p-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
            <Heart className="size-5" />
          </span>
          <div className="grid gap-1">
            <h1 className="text-lg font-semibold">{t.donate.title}</h1>
            <p className="text-sm text-muted-foreground">
              {t.donate.body}
            </p>
          </div>
          {hasQris ? (
            <Image
              src={`/${QRIS_FILE}`}
              alt={t.donate.qrAlt}
              width={280}
              height={280}
              className="h-auto w-full max-w-64 rounded-lg border bg-white p-2"
              priority
            />
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{t.donate.noQr}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t.donate.hint}
          </p>
        </article>
        <Link href="/dashboard" className="justify-self-center text-sm text-muted-foreground underline underline-offset-4">
          {t.common.back}
        </Link>
      </div>
    </main>
  );
}
