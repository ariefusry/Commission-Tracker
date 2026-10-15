import Link from "next/link";
import { Logo } from "@/components/logo";
import { PageControls } from "@/components/page-controls";
import { getDict } from "@/lib/i18n/server";


export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getDict();
  return (
    <main className="relative flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <PageControls />
      <div className="grid w-full max-w-sm gap-6">
        <div className="justify-self-center">
          <Logo />
        </div>
        {children}
        <Link href="/donasi" className="justify-self-center text-xs text-muted-foreground hover:text-foreground">
          {t.auth.footer}
        </Link>
      </div>
    </main>
  );
}
