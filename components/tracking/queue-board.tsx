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

type Item = { key: string; text: string; sub?: string; you: boolean };

type Props = {
  queue: Json | null;
  queuePosition: number | null;
  waitPosition: number | null;
  waitTotal: number | null;
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
              className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm ${
                i.you ? "bg-primary font-medium text-primary-foreground" : "bg-background"
              }`}
            >
              <span>{i.you ? `${i.text} · Kamu` : i.text}</span>
              {i.sub && <span className="text-xs text-muted-foreground">{i.sub}</span>}
            </li>
          ))}
          {rest > 0 && <li className="px-2.5 text-xs text-muted-foreground">+{rest} lainnya</li>}
        </ul>
      )}
    </section>
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
 * - sudah dikerjakan → stepper di atas sudah cukup, cukup info beban kerja artist + perkiraan.
 */
export function QueueBoard({ queue, queuePosition, waitPosition, waitTotal, recentCompletions, today }: Props) {
  const parsed = itemsSchema.safeParse(queue);
  if (!parsed.success || queuePosition === null) return null;

  const recent = recentCompletions ?? [];
  const working = parsed.data.filter((i) => i.status !== "queue");

  if (waitPosition === null) {
    const others = working.filter((i) => !i.you).length;
    return (
      <div className="grid gap-3 border-t pt-4">
        {others > 0 && (
          <p className="text-sm text-muted-foreground">Artist juga sedang mengerjakan {others} commission lain.</p>
        )}
        <Estimate position={queuePosition} recent={recent} today={today} />
      </div>
    );
  }

  const workingItems: Item[] = working.map((i) => ({
    key: `w${i.pos}`,
    text: i.stage,
    sub: i.status === "revision" ? "Revisi" : undefined,
    you: false,
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
