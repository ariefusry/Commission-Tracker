"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { removeAvatar, updatePreferences, uploadAvatar } from "@/app/[lang]/(admin)/settings/actions";
import { useDict } from "@/components/i18n-provider";
import { DeleteAccount } from "@/components/settings/delete-account";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Preferences } from "@/lib/data/settings";
import { ACCENT_KEYS, accentStyle, type Accent } from "@/lib/accent";
import { compressAvatar } from "@/lib/image";
import { translateError } from "@/lib/i18n";

type Status = { error?: string; saved?: boolean };

function StatusText({ pending, status }: { pending: boolean; status: Status }) {
  const { t } = useDict();
  return (
    <p className="min-h-5 text-sm" aria-live="polite">
      {pending ? (
        <span className="text-muted-foreground">{t.common.saving}</span>
      ) : status.error ? (
        <span className="text-destructive">{translateError(t, status.error)}</span>
      ) : status.saved ? (
        <span className="text-muted-foreground">{t.common.saved}</span>
      ) : null}
    </p>
  );
}

function DisplayName({ initial }: { initial: string }) {
  const { t } = useDict();
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
      <Label htmlFor="display_name">{t.settings.artistName}</Label>
      <div className="flex gap-2">
        <Input
          id="display_name"
          placeholder={t.settings.artistNamePlaceholder}
          maxLength={60}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" disabled={pending || value.trim() === saved}>
          {t.common.save}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {t.settings.artistNameHint(value.trim() || "…")}
      </p>
      <StatusText pending={pending} status={status} />
    </form>
  );
}

/**
 * Profil di halaman tracking: foto (opsional) dan warna aksen. Pratinjau = avatar yang dilihat client.
 * Foto dikompres persegi 256px di browser; tanpa foto, avatar berupa inisial berwarna aksen.
 */
function TrackingProfile({ initial, initialPhoto, name }: { initial: Accent | null; initialPhoto: string | null; name: string }) {
  const { t } = useDict();
  const s = t.settings;
  const [value, setValue] = useState<Accent | null>(initial);
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [status, setStatus] = useState<Status>({});
  const [photoStatus, setPhotoStatus] = useState<Status>({});
  const [pending, startTransition] = useTransition();
  const [photoPending, startPhoto] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const options: (Accent | null)[] = [null, ...ACCENT_KEYS];

  const upload = (file: File) =>
    startPhoto(async () => {
      let compressed: File;
      try {
        compressed = await compressAvatar(file);
      } catch {
        setPhotoStatus({ error: t.actions.imageFormat });
        return;
      }
      const form = new FormData();
      form.set("file", compressed);
      const result = await uploadAvatar(form);
      if (!result.error) setPhoto(URL.createObjectURL(compressed));
      setPhotoStatus(result.error ? { error: result.error } : { saved: true });
    });

  const remove = () =>
    startPhoto(async () => {
      const result = await removeAvatar();
      if (!result.error) setPhoto(null);
      setPhotoStatus(result.error ? { error: result.error } : { saved: true });
    });

  const pick = (next: Accent | null) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updatePreferences({ accent_color: next });
      if (result.error) setValue(previous); // kembalikan jika gagal
      setStatus(result.error ? { error: result.error } : { saved: true });
    });
  };

  return (
    <div className="grid gap-4">
    <div className="grid gap-2">
      <span className="text-sm font-medium">{s.photo}</span>
      <div className="flex items-center gap-4 rounded-lg border p-3" style={accentStyle(value)}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob:) atau URL Storage publik
          <img src={photo} alt="" className="size-16 shrink-0 rounded-full border bg-muted object-cover" />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground" aria-hidden>
            {(name.trim()[0] ?? "A").toUpperCase()}
          </span>
        )}
        <div className="grid gap-2">
          <span className="text-sm text-muted-foreground">{s.photoHint}</span>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ""; // pilih file yang sama lagi tetap memicu onChange
                if (file) upload(file);
              }}
            />
            <Button type="button" size="sm" variant="outline" disabled={photoPending} onClick={() => fileRef.current?.click()}>
              <ImagePlus /> {photoPending ? s.photoProcessing : photo ? s.photoChange : s.photoUpload}
            </Button>
            {photo && (
              <Button type="button" size="sm" variant="ghost" disabled={photoPending} onClick={remove}>
                {s.photoRemove}
              </Button>
            )}
          </div>
        </div>
      </div>
      <StatusText pending={photoPending} status={photoStatus} />
    </div>
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{s.accent}</legend>
      <span className="text-sm text-muted-foreground">{s.accentHint}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={s.accent}>
        {options.map((key) => {
          const label = s.accentNames[key ?? "neutral"];
          const selected = value === key;
          return (
            <button
              key={key ?? "neutral"}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              disabled={pending}
              onClick={() => !selected && pick(key)}
              className={`flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform active:scale-95 pointer-coarse:size-11 ${
                selected ? "ring-2 ring-foreground" : "ring-1 ring-border"
              }`}
            >
              <span className="size-6 rounded-full bg-primary" style={accentStyle(key)} />
            </button>
          );
        })}
      </div>
      <StatusText pending={pending} status={status} />
    </fieldset>
    </div>
  );
}

function SlotLimit({ initial }: { initial: number }) {
  const { t } = useDict();
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
      <Label htmlFor="slot_limit">{t.settings.slots}</Label>
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
          {t.common.save}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {t.settings.slotsHint}
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
  const { t } = useDict();
  return (
    <div className="grid gap-6">
      <DisplayName initial={initial.display_name} />
      <SlotLimit initial={initial.slot_limit} />
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">{t.settings.trackingPage}</h3>
        <TrackingProfile initial={initial.accent_color} initialPhoto={initial.avatar_url} name={initial.display_name} />
        <PreferenceToggle field="show_queue" initial={initial.show_queue} title={t.settings.showQueue}>
          {t.settings.showQueueHint}
        </PreferenceToggle>
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">{t.settings.payments}</h3>
        <PreferenceToggle
          field="count_cancelled_paid"
          initial={initial.count_cancelled_paid}
          title={t.settings.countCancelled}
        >
          {t.settings.countCancelledHint}
        </PreferenceToggle>
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">{t.reminders.title}</h3>
        <ReminderSettings initial={initial} />
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">{t.settings.account}</h3>
        <DeleteAccount />
      </div>
    </div>
  );
}
