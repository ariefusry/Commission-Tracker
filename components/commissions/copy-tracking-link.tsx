"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/** Salin link halaman tracking publik untuk dikirim ke client. */
export function CopyTrackingLink({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useDict();

  const copy = async () => {
    await navigator.clipboard.writeText(`${location.origin}/track/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? t.commissions.copied : t.commissions.copyLinkNamed(name)}
      title={copied ? t.commissions.copied : t.commissions.copyLink}
      onClick={copy}
    >
      {copied ? <Check className="text-emerald-600" /> : <Link2 />}
    </Button>
  );
}
