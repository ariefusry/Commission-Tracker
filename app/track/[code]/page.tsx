import { Check } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { SkeletonBlock } from "@/components/skeleton-block";
import { QueueBoard } from "@/components/tracking/queue-board";
import { WipGallery } from "@/components/tracking/wip-gallery";
import { STATUS_LABEL } from "@/lib/commission";
import { getTracking } from "@/lib/data/tracking";
import { deadlineInfo } from "@/lib/deadline";
import { formatDate } from "@/lib/format";
import { todayWib } from "@/lib/date";

export const metadata: Metadata = {
  title: "Progress Commission",
  robots: { index: false, follow: false },
};

const STATUS_TONE: Record<string, string> = {
  queue: "bg-muted text-muted-foreground",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  revision: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground line-through",
};

function NotFound() {
  return (
    <div className="grid gap-2 rounded-xl border bg-card p-6 text-center">
      <p className="font-medium">Kode tracking tidak ditemukan</p>
      <p className="text-sm text-muted-foreground">Periksa kembali link yang dikirim artist kamu.</p>
    </div>
  );
}

async function Tracking({ params }: { params: PageProps<"/track/[code]">["params"] }) {
  const { code } = await params;
  const t = await getTracking(code);
  if (!t) return <NotFound />;

  const done = t.status === "done";
  const stages = t.stages ?? [];
  const today = todayWib();
  const due = deadlineInfo(t.deadline, t.status, today);

  return (
    <article className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6">
      <header className="grid gap-1">
        <p className="text-sm text-muted-foreground">
          {t.artist_name ? `Commission oleh ${t.artist_name}` : "Progress commission"}
        </p>
        <h1 className="text-xl font-semibold">{t.client_username}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t.type_name}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[t.status]}`}>
            {STATUS_LABEL[t.status]}
          </span>
        </div>
      </header>

      <ol className="grid gap-0" aria-label="Tahap pengerjaan">
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
                      ? "Sedang revisi"
                      : t.status === "queue"
                        ? "Menunggu giliran"
                        : t.status === "cancelled"
                          ? "Dibatalkan"
                          : "Sedang dikerjakan"}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <WipGallery wip={t.wip} />

      <QueueBoard
        queue={t.queue}
        queuePosition={t.queue_position}
        waitPosition={t.wait_position}
        waitTotal={t.wait_total}
        slotLimit={t.slot_limit}
        stages={stages}
        recentCompletions={t.recent_completions}
        today={today}
      />

      <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Deadline</dt>
          <dd className="font-medium">
            {formatDate(t.deadline)}
            {(due.tone === "normal" || due.tone === "soon") && (
              <span className="block text-xs font-normal text-muted-foreground">{due.label}</span>
            )}
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Terakhir diperbarui</dt>
          <dd className="font-medium">{formatDate(todayWib(new Date(t.updated_at)))}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function TrackPage({ params }: PageProps<"/track/[code]">) {
  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-10">
      <div className="grid w-full max-w-xl content-start gap-6">
        <div className="justify-self-center">
          <Logo href={null} />
        </div>
        <Suspense fallback={<SkeletonBlock className="h-96" />}>
          <Tracking params={params} />
        </Suspense>
        <p className="text-center text-xs text-muted-foreground">
          Halaman ini hanya menampilkan progress, tanpa data pembayaran. Dibuat dengan Commission Tracker ·{" "}
          <a href="/donasi" className="underline underline-offset-4">
            Dukung
          </a>
        </p>
      </div>
    </main>
  );
}
