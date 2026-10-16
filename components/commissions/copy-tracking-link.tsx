"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { useDict } from "@/components/i18n-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";

/** Salin link halaman tracking publik untuk dikirim ke client. */
export function CopyTrackingLink({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useDict();
  const toast = useToast();

  const copy = async () => {
    const url = `${location.origin}/track/${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Izin clipboard ditolak (mis. sebagian WebView): tampilkan link agar bisa disalin manual.
      toast({ message: t.toast.copyFailed(url), tone: "error" });
      return;
    }
    setCopied(true);
    toast({ message: t.toast.linkCopied(name) });
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
