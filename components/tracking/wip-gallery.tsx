import Image from "next/image";
import { z } from "zod";
import { todayWib } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { wipUrl } from "@/lib/storage";
import type { Json } from "@/types/database";

const wipSchema = z.array(z.object({ path: z.string(), stage: z.string().nullable(), created_at: z.string() }));

/** Galeri WIP di halaman tracking client, terbaru dulu. */
export function WipGallery({ wip }: { wip: Json | null }) {
  const parsed = wipSchema.safeParse(wip);
  if (!parsed.success || parsed.data.length === 0) return null;
  return (
    <section className="grid gap-3 border-t pt-4" aria-label="Gambar WIP">
      <h2 className="text-sm font-medium">Progress gambar ({parsed.data.length})</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {parsed.data.map((w) => (
          <li key={w.path} className="grid gap-1">
            <a
              href={wipUrl(w.path)}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image
                src={wipUrl(w.path)}
                alt={`Progress ${w.stage ?? ""}`}
                fill
                sizes="(max-width: 640px) 50vw, 180px"
                className="object-cover"
                unoptimized
              />
            </a>
            <span className="text-xs text-muted-foreground">
              {w.stage ?? "WIP"} · {formatDate(todayWib(new Date(w.created_at)))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
