import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { PageControls } from "@/components/page-controls";
import { SkeletonBlock } from "@/components/skeleton-block";
import { QueueBoard } from "@/components/tracking/queue-board";
import { WipGallery } from "@/components/tracking/wip-gallery";
import { getTracking } from "@/lib/data/tracking";
import { deadlineInfo, deadlineLabel } from "@/lib/deadline";
import { formatDate } from "@/lib/format";
import { todayWib } from "@/lib/date";
import type { Dict } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/server";
import { accentStyle } from "@/lib/accent";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.meta.track, robots: { index: false, follow: false } };
}

const STATUS_TONE: Record<string, string> = {
  queue: "bg-muted text-muted-foreground",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  revision: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground line-through",
};

function NotFound({ t }: { t: Dict }) {
  return (
    <div className="grid gap-2 rounded-xl border bg-card p-6 text-center">
      <p className="font-medium">{t.tracking.notFound}</p>
      <p className="text-sm text-muted-foreground">{t.tracking.notFoundBody}</p>
    </div>
  );
}

async function Tracking({ params }: { params: PageProps<"/[lang]/track/[code]">["params"] }) {
  const [{ code }, { t: d }] = await Promise.all([params, getDict()]);
  const t = await getTracking(code);
  if (!t) return <NotFound t={d} />;

  const done = t.status === "done";
  const stages = t.stages ?? [];
  const today = todayWib();
  const due = deadlineInfo(t.deadline, t.status, today);

  return (
    // Aksen pilihan artist menggantikan token primary: avatar dan stepper ikut berwarna.
    <article className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6" style={accentStyle(t.accent_color)}>
      <header className="grid gap-1">
        <div className="flex items-center gap-2.5">
          {t.artist_name && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden>
              {t.artist_name.trim()[0].toUpperCase()}
            </span>
          )}
          <p className="text-sm text-muted-foreground">
            {t.artist_name ? d.tracking.by(t.artist_name) : d.tracking.progress}
          </p>
        </div>
        <h1 className="text-xl font-semibold">{t.client_username}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t.type_name}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[t.status]}`}>
            {d.status[t.status]}
          </span>
        </div>
      </header>

      <ol className="grid gap-0" aria-label={d.tracking.stages}>
        {stages.map((name, i) => {
          const state = done || i < t.current_stage ? "done" : i === t.current_stage ? "current" : "next";
          return (
            <li key={name} className="relative flex gap-3 pb-5 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
              {i < stages.length - 1 && (
                <span
                  className={`absolute top-7 left-[13px] h-[calc(100%-1.75rem)] w-0.5 ${state === "done" ? "bg-primary" : "bg-border"}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  state === "done"
                    ? "border-primary bg-primary text-primary-foreground"
                    : state === "current"
                      ? "border-primary bg-background text-foreground ring-4 ring-primary/15"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {state === "done" ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="grid pt-0.5">
                <span className={state === "next" ? "text-muted-foreground" : "font-medium"}>{name}</span>
                {state === "current" && (
                  <span className="text-xs text-muted-foreground">
                    {t.status === "revision"
                      ? d.tracking.revising
                      : t.status === "queue"
                        ? d.tracking.waiting
                        : t.status === "cancelled"
                          ? d.tracking.cancelled
                          : d.tracking.working}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <WipGallery wip={t.wip} t={d} />

      <QueueBoard
        queue={t.queue}
        queuePosition={t.queue_position}
        waitPosition={t.wait_position}
        waitTotal={t.wait_total}
        slotLimit={t.slot_limit}
        stages={stages}
        recentCompletions={t.recent_completions}
        today={today}
        t={d}
      />

      <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">{d.tracking.deadline}</dt>
          <dd className="font-medium">
            {formatDate(t.deadline, d.intl)}
            {(due.tone === "normal" || due.tone === "soon") && (
              <span className="block text-xs font-normal text-muted-foreground">{deadlineLabel(due, d)}</span>
            )}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">{d.tracking.updated}</dt>
          <dd className="font-medium">{formatDate(todayWib(new Date(t.updated_at)), d.intl)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default async function TrackPage({ params }: PageProps<"/[lang]/track/[code]">) {
  const { t } = await getDict();
  return (
    <main className="relative flex flex-1 justify-center bg-muted/40 px-4 py-10">
      <PageControls />
      <div className="grid w-full max-w-xl content-start gap-6">
        <div className="justify-self-center">
          <Logo href={null} />
        </div>
        <Suspense fallback={<SkeletonBlock className="h-96" />}>
          <Tracking params={params} />
        </Suspense>
        <p className="text-center text-xs text-muted-foreground">
          {t.tracking.footer}{" "}
          <Link href="/donasi" className="underline underline-offset-4">
            {t.tracking.support}
          </Link>
        </p>
      </div>
    </main>
  );
}
