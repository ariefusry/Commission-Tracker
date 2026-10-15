import { SearchX } from "lucide-react";
import Link from "next/link";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n/server";


export default async function AdminNotFound() {
  const { t } = await getDict();
  return (
    <StateMessage icon={SearchX} title={t.states.dataNotFound} description={t.states.dataNotFoundBody}>
      <Button variant="outline" nativeButton={false} render={<Link href="/commissions" />}>
        {t.states.toCommissions}
      </Button>
    </StateMessage>
  );
}
