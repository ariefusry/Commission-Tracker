"use client"; // Error boundary wajib Client Component

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useDict } from "@/components/i18n-provider";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useDict();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StateMessage
      icon={TriangleAlert}
      title={t.states.errorTitle}
      description={t.states.errorBody}
    >
      <Button onClick={() => retry()}>{t.common.retry}</Button>
      <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
        {t.states.toDashboard}
      </Button>
    </StateMessage>
  );
}
