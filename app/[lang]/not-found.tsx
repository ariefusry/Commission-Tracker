import { SearchX } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n/server";


export default async function NotFound() {
  const { t } = await getDict();
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="grid w-full max-w-md gap-6">
        <div className="justify-self-center">
          <Logo href={null} />
        </div>
        <StateMessage icon={SearchX} title={t.states.pageNotFound} description={t.states.pageNotFoundBody}>
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
            {t.states.toHome}
          </Button>
        </StateMessage>
      </div>
    </main>
  );
}
