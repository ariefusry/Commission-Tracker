"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { deleteWip, uploadWip } from "@/app/[lang]/(admin)/commissions/wip-actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { todayWib } from "@/lib/date";
import type { WipImage } from "@/lib/data/commissions";
import { formatDate } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { WIP_MAX_PER_COMMISSION } from "@/lib/storage";

/** Gambar WIP commission: upload (dikompres di browser), lihat, hapus. Tampil juga di halaman tracking client. */
export function WipManager({ commissionId, images }: { commissionId: string; images: WipImage[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ error?: string; info?: string }>({});
  const { t } = useDict();
  const w = t.wip;
  const remaining = WIP_MAX_PER_COMMISSION - images.length;

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, remaining);
    const skipped = files.length - list.length;
    startTransition(async () => {
      let done = 0;
      for (const file of list) {
        setStatus({ info: w.uploading(done + 1, list.length) });
        try {
          const compressed = await compressImage(file);
          const form = new FormData();
          form.set("commission_id", commissionId);
          form.set("file", compressed);
          const result = await uploadWip(form);
          if (result.error) {
            setStatus({ error: result.error });
            return;
          }
          done++;
        } catch {
          setStatus({ error: w.unreadable(file.name) });
          return;
        }
      }
      setStatus({
        info: w.uploaded(done) + (skipped ? w.skipped(skipped, WIP_MAX_PER_COMMISSION) : ""),
      });
    });
    if (input.current) input.current.value = "";
  };

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="font-semibold">
            {w.title} <span className="font-normal text-muted-foreground">({images.length}/{WIP_MAX_PER_COMMISSION})</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {w.description}
          </p>
        </div>
        <Button type="button" variant="outline" disabled={pending || remaining <= 0} onClick={() => input.current?.click()}>
          {pending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {remaining <= 0 ? w.limitReached : w.add}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label={w.pick}
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {(status.error || status.info) && (
        <p
          className={`text-sm ${status.error ? "text-destructive" : "text-muted-foreground"}`}
          role={status.error ? "alert" : "status"}
        >
          {status.error ?? status.info}
        </p>
      )}

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {w.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((img) => (
            <li key={img.id} className="grid gap-1">
              <a
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                <Image src={img.url} alt={`WIP ${img.stage ?? ""}`} fill sizes="200px" className="object-cover" unoptimized />
              </a>
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="truncate text-muted-foreground">
                  {img.stage ?? "WIP"} · {formatDate(todayWib(new Date(img.created_at)), t.intl)}
                </span>
                <ConfirmDeleteButton
                  label={w.deleteLabel}
                  title={w.deleteTitle}
                  description={w.deleteBody}
                  disabled={pending}
                  onConfirm={() => deleteWip(img.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
