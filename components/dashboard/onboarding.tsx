"use client";

import { ChevronRight, Circle, CircleCheck, X } from "lucide-react";
import Link from "next/link";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { FLAGS, setFlag, useFlag } from "@/lib/stored-flag";

/**
 * Panduan awal di dashboard: tiga langkah yang tercentang sendiri dari data.
 * Hilang setelah semua selesai atau disembunyikan (diingat di perangkat ini).
 */
export function Onboarding({ pricesSet, hasCommission }: { pricesSet: boolean; hasCommission: boolean }) {
  const { t } = useDict();
  const o = t.onboarding;
  // Server: anggap tersembunyi agar pengguna lama tidak melihatnya berkedip.
  const dismissed = useFlag(FLAGS.onboardingDismissed, true);
  const linkShared = useFlag(FLAGS.trackingLinkShared, false);

  const steps = [
    { done: pricesSet, title: o.prices, hint: o.pricesHint, href: "/settings" },
    { done: hasCommission, title: o.first, hint: o.firstHint, href: "/commissions/new" },
    { done: linkShared, title: o.share, hint: o.shareHint, href: "/commissions" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;

  return (
    <section aria-labelledby="onboarding-title" className="grid gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id="onboarding-title" className="font-semibold">
            {o.title}
          </h2>
          <p className="text-sm text-muted-foreground">{o.progress(doneCount, steps.length)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={o.dismiss} title={o.dismiss} onClick={() => setFlag(FLAGS.onboardingDismissed)}>
          <X />
        </Button>
      </div>
      <ol className="grid gap-1">
        {steps.map((s, i) => {
          const body = (
            <>
              {s.done ? (
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              ) : (
                <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
                  <Circle className="absolute size-5" />
                  <span className="text-[0.65rem] font-semibold">{i + 1}</span>
                </span>
              )}
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className={s.done ? "text-muted-foreground line-through" : "font-medium"}>{s.title}</span>
                {!s.done && <span className="text-sm text-muted-foreground">{s.hint}</span>}
              </span>
              {!s.done && <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
            </>
          );
          return (
            <li key={s.href}>
              {s.done ? (
                <div className="flex items-start gap-3 px-2 py-2 text-sm">
                  {body}
                  <span className="sr-only">{o.doneLabel}</span>
                </div>
              ) : (
                <Link href={s.href} className="flex min-h-11 items-start gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted active:scale-[0.99]">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
