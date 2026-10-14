import { CalendarClock, Hourglass, Paintbrush } from "lucide-react";
import { z } from "zod";
import { STATUSES } from "@/lib/commission";
import { formatDate } from "@/lib/format";
import { estimateFinish } from "@/lib/queue";
import type { Json } from "@/types/database";

// Item papan dari get_tracking: tanpa nama/kode client lain.
const itemsSchema = z.array(
  z.object({ pos: z.number(), stage: z.string(), status: z.enum(STATUSES), you: z.boolean() }),
);

const VISIBLE = 8; // sisanya diringkas "+N lainnya"

type Item = { key: string; text: string; sub?: string; you: boolean; step?: { index: number; total: number } };

type Props = {
  queue: Json | null;
  queuePosition: number | null;
  waitPosition: number | null;
  waitTotal: number | null;
  slotLimit: number | null;
  stages: string[];
  recentCompletions: string[] | null;
  today: string;
};

function Column({ title, icon: Icon, items, empty }: { title: string; icon: typeof Paintbrush; items: Item[]; empty: string }) {
  const shown = items.slice(0, VISIBLE);
  const youHidden = items.slice(VISIBLE).find((i) => i.you);
  const rest = items.length - shown.length - (youHidden ? 1 : 0);
  return (
    <section className="grid content-start gap-2 rounded-lg bg-muted/50 p-3" aria-label={title}>
      <h3 className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" /> {title}
        <span className="text-muted-foreground">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-1.5">
          {[...shown, ...(youHidden ? [youHidden] : [])].map((i) => (
            <li
              key={i.key}
              className={`grid gap-1.5 rounded-md px-2.5 py-2 text-sm ${
                i.you ? "bg-primary font-medium text-primary-foreground" : "bg-background"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span>{i.you ? `${i.text} · Kamu` : i.text}</span>
                {i.sub && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {i.sub}
                  </span>
                )}
                {!i.sub && i.step && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Tahap {i.step.index + 1} dari {i.step.total}
                  </span>
                )}
              </span>
              {i.step && <StepBar step={i.step} />}
            </li>
          ))}
          {rest > 0 && <li className="px-2.5 text-xs text-muted-foreground">+{rest} lainnya</li>}
        </ul>
      )}
    </section>
  );
}

/** Progress tahap: segmen per tahap sesuai urutan di Pengaturan, terisi sampai tahap sekarang. */
function StepBar({ step }: { step: { index: number; total: number } }) {
  return (
    <span
      className="flex gap-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={step.total}
      aria-valuenow={step.index + 1}
      aria-label={`Tahap ${step.index + 1} dari ${step.total}`}
    >
      {Array.from({ length: step.total }, (_, n) => (
        <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step.index ? "bg-primary" : "bg-muted"}`} />
      ))}
    </span>
  );
}

function Estimate({ position, recent, today }: { position: number; recent: string[]; today: string }) {
  const e = estimateFinish(position, recent, today);
  if (!e) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border p-3">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="grid gap-0.5">
        <p className="text-sm">
          Perkiraan selesai{" "}
          <span className="font-medium">
            {formatDate(e.from)} – {formatDate(e.to)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Dihitung dari kecepatan artist 90 hari terakhir (±{Math.round(e.pace)} hari per commission). Ini perkiraan, bukan
          janji.
        </p>
      </div>
    </div>
  );
}

/**
 * Antrean ala board Trello artist:
 * - masih di waiting list → posisi, perkiraan, papan "Sedang dikerjakan" (commission lain) + "Waiting list";
 * - sudah dikerjakan → perkiraan + commission LAIN yang sedang dikerjakan (miliknya sudah di stepper).
 */
export function QueueBoard({ queue, queuePosition, waitPosition, waitTotal, slotLimit, stages, recentCompletions, today }: Props) {
  const parsed = itemsSchema.safeParse(queue);
  if (!parsed.success || queuePosition === null) return null;

  const recent = recentCompletions ?? [];
  const working = parsed.data.filter((i) => i.status !== "queue");
  // Nama tahap unik per artist → posisi di urutan Pengaturan. Tahap nonaktif: tanpa bar.
  const stepOf = (stage: string) => {
    const index = stages.indexOf(stage);
    return index < 0 ? undefined : { index, total: stages.length };
  };

  if (waitPosition === null) {
    // Commission client sudah dikerjakan: stepper sudah menampilkan tahapnya, jadi daftar ini
    // hanya berisi commission LAIN yang sedang dikerjakan artist (tanpa nama).
    const others: Item[] = working
      .filter((i) => !i.you)
      .map((i) => ({
        key: `w${i.pos}`,
        text: i.stage,
        sub: i.status === "revision" ? "Revisi" : undefined,
        you: false,
        step: stepOf(i.stage),
      }));
    return (
      <div className="grid gap-3 border-t pt-4">
        <Estimate position={queuePosition} recent={recent} today={today} />
        {others.length > 0 && (
          <Column title="Artist juga sedang mengerjakan" icon={Paintbrush} items={others} empty="" />
        )}
      </div>
    );
  }

  const workingItems: Item[] = working.map((i) => ({
    key: `w${i.pos}`,
    text: i.stage,
    sub: i.status === "revision" ? "Revisi" : undefined,
    you: false,
    step: stepOf(i.stage),
  }));
  const waitingItems: Item[] = parsed.data
    .filter((i) => i.status === "queue")
    .map((i, idx) => ({ key: `q${i.pos}`, text: `Urutan ${idx + 1}`, you: i.you }));

  return (
    <div className="grid gap-3 border-t pt-4">
      <div className="grid gap-1">
        <p className="text-sm text-muted-foreground">Giliran kamu</p>
        <p className="text-lg font-semibold">
          Waiting list ke-{waitPosition} dari {waitTotal}
        </p>
        <p className="text-sm text-muted-foreground">
          {slotLimit ? `Slot artist ${working.length}/${slotLimit} terisi. ` : ""}
          Commission mulai dikerjakan sesuai urutan pesanan, setelah ada slot yang selesai.
        </p>
      </div>
      <Estimate position={queuePosition} recent={recent} today={today} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Column title="Sedang dikerjakan" icon={Paintbrush} items={workingItems} empty="Belum ada" />
        <Column title="Waiting list" icon={Hourglass} items={waitingItems} empty="Kosong" />
      </div>
    </div>
  );
}
