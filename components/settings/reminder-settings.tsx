"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { saveReminders, sendTestReminder } from "@/app/[lang]/(admin)/settings/actions";
import { AppSelect } from "@/components/app-select";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Preferences, ReminderChannel } from "@/lib/data/settings";
import { translateError } from "@/lib/i18n";

const DAY_OPTIONS = [1, 2, 3, 5, 7, 14];

type Status = { error?: string; info?: string };

/** Pengingat deadline: pilih saluran (Discord sekarang, email jika layanan pengirim sudah dipasang). */
export function ReminderSettings({ initial }: { initial: Preferences }) {
  const { t } = useDict();
  const r = t.reminders;
  const [channel, setChannel] = useState<ReminderChannel>(initial.reminder_channel);
  const [url, setUrl] = useState(initial.discord_webhook_url);
  const [days, setDays] = useState(initial.reminder_days);
  const [saved, setSaved] = useState({ channel: initial.reminder_channel, url: initial.discord_webhook_url, days: initial.reminder_days });
  const [urlError, setUrlError] = useState<string>();
  const [status, setStatus] = useState<Status>({});
  const [pending, startTransition] = useTransition();
  const input = { reminder_channel: channel, discord_webhook_url: url, reminder_days: days };
  const dirty = channel !== saved.channel || url.trim() !== saved.url || days !== saved.days;

  const run = (action: typeof saveReminders, success: string, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action(input);
      setUrlError(translateError(t, result.fieldErrors?.discord_webhook_url?.[0]));
      if (result.error || result.fieldErrors) {
        setStatus(result.error ? { error: result.error } : {});
        return;
      }
      onDone?.();
      setStatus({ info: success });
    });

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">{r.hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="reminder_channel">{r.channel}</Label>
          <AppSelect
            id="reminder_channel"
            value={channel}
            onValueChange={(v) => setChannel(v as ReminderChannel)}
            options={[
              { value: "off", label: r.off },
              { value: "discord", label: r.discord },
              // Email baru bisa dipilih setelah layanan pengirim dipasang.
              ...(initial.email_available || channel === "email" ? [{ value: "email", label: r.email }] : []),
            ]}
          />
          {!initial.email_available && <span className="text-xs text-muted-foreground">{r.emailSoon}</span>}
        </div>
        {channel !== "off" && (
          <div className="grid content-start gap-1.5">
            <Label htmlFor="reminder_days">{r.days}</Label>
            <AppSelect
              id="reminder_days"
              value={String(days)}
              onValueChange={(v) => setDays(Number(v))}
              options={DAY_OPTIONS.map((n) => ({ value: String(n), label: r.daysOption(n) }))}
            />
          </div>
        )}
      </div>

      {channel === "discord" && (
        <div className="grid content-start gap-1.5">
          <Label htmlFor="discord_webhook_url">{r.webhook}</Label>
          <Input
            id="discord_webhook_url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://discord.com/api/webhooks/…"
            value={url}
            aria-invalid={Boolean(urlError)}
            onChange={(e) => setUrl(e.target.value)}
          />
          {urlError ? (
            <p className="text-sm text-destructive">{urlError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{r.webhookHelp}</p>
          )}
        </div>
      )}
      {channel === "email" && initial.email && <p className="text-sm text-muted-foreground">{r.emailTo(initial.email)}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={pending || !dirty}
          onClick={() => run(saveReminders, r.saved, () => setSaved({ channel, url: url.trim(), days }))}
        >
          {pending ? t.common.saving : t.common.save}
        </Button>
        {channel !== "off" && (
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(sendTestReminder, r.testSent)}>
            <Send /> {r.test}
          </Button>
        )}
      </div>
      <p className="min-h-5 text-sm" aria-live="polite">
        {status.error ? <span className="text-destructive">{status.error}</span> : <span className="text-muted-foreground">{status.info}</span>}
      </p>
    </div>
  );
}
