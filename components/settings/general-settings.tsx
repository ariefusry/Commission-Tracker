"use client";

import { useState, useTransition } from "react";
import { updatePreferences } from "@/app/(admin)/settings/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Preferences } from "@/lib/data/settings";

type Status = { error?: string; saved?: boolean };

function StatusText({ pending, status }: { pending: boolean; status: Status }) {
  return (
    <p className="min-h-5 text-sm" aria-live="polite">
      {pending ? (
        <span className="text-muted-foreground">Menyimpan...</span>
      ) : status.error ? (
        <span className="text-destructive">{status.error}</span>
      ) : status.saved ? (
        <span className="text-muted-foreground">Tersimpan.</span>
      ) : null}
    </p>
  );
}

function DisplayName({ initial }: { initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>({});
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await updatePreferences({ display_name: value });
      const error = result.error ?? result.fieldErrors?.display_name?.[0];
      if (!error) setSaved(value.trim());
      setStatus(error ? { error } : { saved: true });
    });

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Label htmlFor="display_name">Nama artist</Label>
      <div className="flex gap-2">
        <Input
          id="display_name"
          placeholder="Nama yang dilihat client"
          maxLength={60}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" disabled={pending || value.trim() === saved}>
          Simpan
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Tampil sebagai &quot;Commission oleh {value.trim() || "…"}&quot; di halaman tracking. Kosongkan untuk menyembunyikan.
      </p>
      <StatusText pending={pending} status={status} />
    </form>
  );
}

function SlotLimit({ initial }: { initial: number }) {
  const [saved, setSaved] = useState(String(initial));
  const [value, setValue] = useState(String(initial));
  const [status, setStatus] = useState<Status>({});
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await updatePreferences({ slot_limit: value === "" ? Number.NaN : Number(value) });
      const error = result.error ?? result.fieldErrors?.slot_limit?.[0];
      if (!error) setSaved(value);
      setStatus(error ? { error } : { saved: true });
    });

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Label htmlFor="slot_limit">Jumlah slot</Label>
      <div className="flex gap-2">
        <Input
          id="slot_limit"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          className="w-24"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" disabled={pending || value === saved}>
          Simpan
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Berapa commission yang kamu kerjakan bersamaan. Jika slot penuh, commission baru otomatis masuk waiting list.
      </p>
      <StatusText pending={pending} status={status} />
    </form>
  );
}

function PreferenceToggle({
  field,
  initial,
  title,
  children,
}: {
  field: "count_cancelled_paid" | "show_queue";
  initial: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>({});
  const [pending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setValue(next);
    startTransition(async () => {
      const result = await updatePreferences({ [field]: next });
      if (result.error) setValue(!next); // kembalikan jika gagal
      setStatus(result.error ? { error: result.error } : { saved: true });
    });
  };

  return (
    <div className="grid gap-2">
      <label className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox className="mt-0.5" checked={value} disabled={pending} onCheckedChange={toggle} />
        <span className="grid gap-1">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">{children}</span>
        </span>
      </label>
      <StatusText pending={pending} status={status} />
    </div>
  );
}

export function GeneralSettings({ initial }: { initial: Preferences }) {
  return (
    <div className="grid gap-6">
      <DisplayName initial={initial.display_name} />
      <SlotLimit initial={initial.slot_limit} />
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Halaman tracking client</h3>
        <PreferenceToggle field="show_queue" initial={initial.show_queue} title="Tampilkan antrean dan perkiraan selesai">
          Client melihat posisinya di antrean, papan &quot;Sedang dikerjakan&quot; / &quot;Waiting list&quot; (tanpa nama client
          lain), dan perkiraan tanggal selesai dari kecepatan kerja kamu.
        </PreferenceToggle>
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Pembayaran</h3>
        <PreferenceToggle
          field="count_cancelled_paid"
          initial={initial.count_cancelled_paid}
          title="Hitung DP dari commission yang dibatalkan sebagai uang masuk"
        >
          Aktifkan jika DP tidak dikembalikan saat client membatalkan. Uangnya masuk ke &quot;Sudah dibayar&quot; di
          dashboard, tapi tidak ke nilai order. Jika kamu mengembalikan DP untuk commission tertentu, ubah status bayarnya
          ke &quot;Belum bayar&quot;.
        </PreferenceToggle>
      </div>
    </div>
  );
}
