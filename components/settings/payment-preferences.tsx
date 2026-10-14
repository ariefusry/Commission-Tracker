"use client";

import { useState, useTransition } from "react";
import { updatePreferences } from "@/app/(admin)/settings/actions";
import { Checkbox } from "@/components/ui/checkbox";
import type { Preferences } from "@/lib/data/settings";

/** Tersimpan otomatis saat dicentang. */
export function PaymentPreferences({ initial }: { initial: Preferences }) {
  const [value, setValue] = useState(initial.count_cancelled_paid);
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({});
  const [pending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setValue(next);
    startTransition(async () => {
      const result = await updatePreferences({ count_cancelled_paid: next });
      if (result.error) setValue(!next); // kembalikan jika gagal
      setStatus(result.error ? { error: result.error } : { saved: true });
    });
  };

  return (
    <div className="grid gap-2">
      <label className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox className="mt-0.5" checked={value} disabled={pending} onCheckedChange={toggle} />
        <span className="grid gap-1">
          <span className="text-sm font-medium">Hitung DP dari commission yang dibatalkan sebagai uang masuk</span>
          <span className="text-sm text-muted-foreground">
            Aktifkan jika DP tidak dikembalikan saat client membatalkan. Uangnya masuk ke &quot;Sudah dibayar&quot; di
            dashboard, tapi tidak ke nilai order. Jika kamu mengembalikan DP untuk commission tertentu, ubah status bayarnya
            ke &quot;Belum bayar&quot;.
          </span>
        </span>
      </label>
      <p className="min-h-5 text-sm" aria-live="polite">
        {pending ? (
          <span className="text-muted-foreground">Menyimpan...</span>
        ) : status.error ? (
          <span className="text-destructive">{status.error}</span>
        ) : status.saved ? (
          <span className="text-muted-foreground">Tersimpan.</span>
        ) : null}
      </p>
    </div>
  );
}
