import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageControls } from "@/components/page-controls";
import { getDict } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.privacy.title} · Commission Tracker` };
}

export default async function PrivacyPage() {
  const { t } = await getDict();
  return (
    <main className="relative flex flex-1 justify-center bg-muted/40 px-4 py-10">
      <PageControls />
      <div className="grid w-full max-w-2xl content-start gap-6">
        <div className="justify-self-center">
          <Logo href="/" />
        </div>
        <article className="grid gap-6 rounded-xl border bg-card p-6 sm:p-8">
          <header className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t.privacy.title}</h1>
            <p className="text-sm text-muted-foreground">{t.privacy.updated}</p>
          </header>
          {t.privacy.sections.map((s) => (
            <section key={s.title} className="grid gap-2">
              <h2 className="font-semibold">{s.title}</h2>
              <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
        <Link href="/" className="justify-self-center text-sm text-muted-foreground underline underline-offset-4">
          {t.common.back}
        </Link>
      </div>
    </main>
  );
}
